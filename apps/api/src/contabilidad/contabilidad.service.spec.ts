import { BadRequestException, ConflictException } from '@nestjs/common';
import { EstadoOrden, EstadoPagoOrden } from '../generated/client/client';
import { PrismaService } from '../prisma/prisma.service';
import { ContabilidadService } from './contabilidad.service';

type MockOrder = {
  id: string;
  tenantId: string;
  empresaId: string;
  tecnicoId: string;
  valorCotizado: number;
  valorPagado: number;
  comprobantePago: string | Array<{ tipo: string; path: string; fecha?: Date }>;
  desglosePago: Array<{ metodo: string; monto: number; banco?: string; referencia?: string }>;
  declaracionEfectivo:
    | null
    | {
        valorDeclarado: number;
        consignado: boolean;
        tecnicoId: string;
      };
  consignacionOrden: { id: string } | null;
};

describe('ContabilidadService - registrarConsignacion endurecido', () => {
  function buildService() {
    const prismaMock = {
      $transaction: jest.fn(async (cb: (tx: any) => Promise<unknown>) => cb(prismaMock)),
      consignacionEfectivo: {
        create: jest.fn().mockResolvedValue({ id: 'cons-1' }),
      },
      consignacionOrden: {
        create: jest.fn().mockResolvedValue({ id: 'co-1' }),
      },
      declaracionEfectivo: {
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue({}),
        create: jest.fn().mockResolvedValue({}),
      },
      tenantMembership: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      ordenServicio: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
    } as unknown as PrismaService;

    return {
      service: new ContabilidadService(prismaMock),
      prismaMock: prismaMock as any,
    };
  }

  const tenantId = 'tenant-1';
  const creatorId = 'membership-1';
  const baseData = {
    tecnicoId: 'tech-1',
    empresaId: 'emp-1',
    valorConsignado: 50000,
    referenciaBanco: 'REF123',
    comprobantePath: 'path/to/comprobante.jpg',
    ordenIds: ['orden-1'],
    fechaConsignacion: '2026-03-24',
  };

  const makeOrder = (overrides: Partial<MockOrder> = {}): MockOrder => ({
    id: 'orden-1',
    tenantId,
    empresaId: 'emp-1',
    tecnicoId: 'tech-1',
    valorCotizado: 100000,
    valorPagado: 50000,
    comprobantePago: [],
    desglosePago: [{ metodo: 'EFECTIVO', monto: 50000 }],
    declaracionEfectivo: {
      valorDeclarado: 50000,
      consignado: false,
      tecnicoId: 'tech-1',
    },
    consignacionOrden: null,
    ...overrides,
  });

  it('rechaza si no se selecciona ninguna orden', async () => {
    const { service } = buildService();

    await expect(
      service.registrarConsignacion(tenantId, creatorId, {
        ...baseData,
        ordenIds: [],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('ignora el valorConsignado legado cuando no coincide y recalcula en backend', async () => {
    const { service, prismaMock } = buildService();

    prismaMock.ordenServicio.findMany.mockResolvedValue([
      makeOrder({
        id: 'orden-1',
        valorPagado: 70000,
        valorCotizado: 100000,
        desglosePago: [{ metodo: 'EFECTIVO', monto: 70000 }],
        declaracionEfectivo: {
          valorDeclarado: 70000,
          consignado: false,
          tecnicoId: 'tech-1',
        },
      }),
    ]);

    await service.registrarConsignacion(tenantId, creatorId, {
      ...baseData,
      valorConsignado: 65000,
    });

    expect(prismaMock.consignacionEfectivo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          valorConsignado: 70000,
        }),
      }),
    );
  });

  it('recalcula la consignación aunque el request no envíe valorConsignado', async () => {
    const { service, prismaMock } = buildService();

    prismaMock.ordenServicio.findMany.mockResolvedValue([
      makeOrder({
        id: 'orden-sin-valor-legado',
        valorCotizado: 80000,
        valorPagado: 80000,
        desglosePago: [{ metodo: 'EFECTIVO', monto: 80000 }],
        declaracionEfectivo: {
          valorDeclarado: 80000,
          consignado: false,
          tecnicoId: 'tech-1',
        },
      }),
    ]);

    const { valorConsignado: _legacyValue, ...requestWithoutValue } = baseData;

    await service.registrarConsignacion(tenantId, creatorId, {
      ...requestWithoutValue,
      ordenIds: ['orden-sin-valor-legado'],
    });

    expect(prismaMock.consignacionEfectivo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          valorConsignado: 80000,
        }),
      }),
    );
  });

  it('procesa múltiples órdenes con montos distintos y liquida solo las que ya cubren el total', async () => {
    const { service, prismaMock } = buildService();

    prismaMock.ordenServicio.findMany.mockResolvedValue([
      makeOrder({
        id: 'orden-total',
        valorCotizado: 60000,
        valorPagado: 60000,
        desglosePago: [{ metodo: 'EFECTIVO', monto: 60000 }],
        declaracionEfectivo: {
          valorDeclarado: 60000,
          consignado: false,
          tecnicoId: 'tech-1',
        },
      }),
      makeOrder({
        id: 'orden-parcial',
        valorCotizado: 90000,
        valorPagado: 30000,
        desglosePago: [{ metodo: 'EFECTIVO', monto: 30000 }],
        declaracionEfectivo: {
          valorDeclarado: 30000,
          consignado: false,
          tecnicoId: 'tech-1',
        },
      }),
    ]);

    await service.registrarConsignacion(tenantId, creatorId, {
      ...baseData,
      valorConsignado: 90000,
      ordenIds: ['orden-total', 'orden-parcial'],
    });

    expect(prismaMock.consignacionEfectivo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          valorConsignado: 90000,
        }),
      }),
    );

    expect(prismaMock.ordenServicio.update).toHaveBeenCalledTimes(2);

    expect(prismaMock.ordenServicio.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'orden-total' },
        data: expect.objectContaining({
          estadoPago: EstadoPagoOrden.CONCILIADO,
          estadoServicio: EstadoOrden.LIQUIDADO,
        }),
      }),
    );

    expect(prismaMock.ordenServicio.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'orden-parcial' },
        data: expect.objectContaining({
          estadoPago: EstadoPagoOrden.PARCIAL,
          estadoServicio: undefined,
        }),
      }),
    );
  });

  it('deduplica órdenes repetidas en el input y no duplica la conciliación', async () => {
    const { service, prismaMock } = buildService();

    prismaMock.ordenServicio.findMany.mockResolvedValue([
      makeOrder({
        id: 'orden-dup',
        valorCotizado: 50000,
        valorPagado: 50000,
        desglosePago: [{ metodo: 'EFECTIVO', monto: 50000 }],
        declaracionEfectivo: {
          valorDeclarado: 50000,
          consignado: false,
          tecnicoId: 'tech-1',
        },
      }),
    ]);

    await service.registrarConsignacion(tenantId, creatorId, {
      ...baseData,
      valorConsignado: 50000,
      ordenIds: ['orden-dup', 'orden-dup'],
    });

    expect(prismaMock.ordenServicio.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { in: ['orden-dup'] },
        }),
      }),
    );

    expect(prismaMock.consignacionOrden.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.ordenServicio.update).toHaveBeenCalledTimes(1);
  });

  it('rechaza órdenes sin efectivo conciliable', async () => {
    const { service, prismaMock } = buildService();

    prismaMock.ordenServicio.findMany.mockResolvedValue([
      makeOrder({
        id: 'orden-sin-efectivo',
        valorCotizado: 100000,
        valorPagado: 100000,
        desglosePago: [{ metodo: 'TRANSFERENCIA', monto: 100000 }],
        declaracionEfectivo: null,
      }),
    ]);

    await expect(
      service.registrarConsignacion(tenantId, creatorId, {
        ...baseData,
        ordenIds: ['orden-sin-efectivo'],
        valorConsignado: 100000,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rechaza órdenes ya consignadas o ya conciliadas', async () => {
    const { service, prismaMock } = buildService();

    prismaMock.ordenServicio.findMany.mockResolvedValue([
      makeOrder({
        id: 'orden-consignada',
        consignacionOrden: { id: 'co-existing' },
      }),
    ]);

    await expect(
      service.registrarConsignacion(tenantId, creatorId, {
        ...baseData,
        ordenIds: ['orden-consignada'],
        valorConsignado: 50000,
      }),
    ).rejects.toThrow('ya tiene una consignación registrada');

    prismaMock.ordenServicio.findMany.mockResolvedValue([
      makeOrder({
        id: 'orden-conciliada',
        declaracionEfectivo: {
          valorDeclarado: 50000,
          consignado: true,
          tecnicoId: 'tech-1',
        },
      }),
    ]);

    await expect(
      service.registrarConsignacion(tenantId, creatorId, {
        ...baseData,
        ordenIds: ['orden-conciliada'],
        valorConsignado: 50000,
      }),
    ).rejects.toThrow('ya fue conciliada previamente');
  });

  it('rechaza órdenes con técnico inconsistente', async () => {
    const { service, prismaMock } = buildService();

    prismaMock.ordenServicio.findMany.mockResolvedValue([
      makeOrder({
        id: 'orden-tech-mismatch',
        declaracionEfectivo: {
          valorDeclarado: 50000,
          consignado: false,
          tecnicoId: 'tech-otro',
        },
      }),
    ]);

    await expect(
      service.registrarConsignacion(tenantId, creatorId, {
        ...baseData,
        ordenIds: ['orden-tech-mismatch'],
        valorConsignado: 50000,
      }),
    ).rejects.toThrow('no pertenece al técnico seleccionado');
  });

  it('recalcula el total desde backend usando la declaración y no el cashAmount del breakdown', async () => {
    const { service, prismaMock } = buildService();

    prismaMock.ordenServicio.findMany.mockResolvedValue([
      makeOrder({
        id: 'orden-declaracion-mayor',
        valorPagado: 70000,
        desglosePago: [{ metodo: 'EFECTIVO', monto: 50000 }],
        declaracionEfectivo: {
          valorDeclarado: 70000,
          consignado: false,
          tecnicoId: 'tech-1',
        },
      }),
    ]);

    await service.registrarConsignacion(tenantId, creatorId, {
      ...baseData,
      ordenIds: ['orden-declaracion-mayor'],
      valorConsignado: 70000,
    });

    expect(prismaMock.consignacionEfectivo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          valorConsignado: 70000,
        }),
      }),
    );
  });

  it('migra soportes de string a array y anexa el nuevo comprobante', async () => {
    const { service, prismaMock } = buildService();

    prismaMock.ordenServicio.findMany.mockResolvedValue([
      makeOrder({
        id: 'orden-soportes',
        valorCotizado: 50000,
        valorPagado: 50000,
        comprobantePago: 'old-path.jpg',
        desglosePago: [{ metodo: 'EFECTIVO', monto: 50000 }],
        declaracionEfectivo: {
          valorDeclarado: 50000,
          consignado: false,
          tecnicoId: 'tech-1',
        },
      }),
    ]);

    await service.registrarConsignacion(tenantId, creatorId, {
      ...baseData,
      ordenIds: ['orden-soportes'],
      valorConsignado: 50000,
      comprobantePath: 'new-path.jpg',
    });

    const updateCall = prismaMock.ordenServicio.update.mock.calls[0][0];
    const soportes = updateCall.data.comprobantePago;

    expect(Array.isArray(soportes)).toBe(true);
    expect(soportes).toHaveLength(2);
    expect(soportes[0].path).toBe('old-path.jpg');
    expect(soportes[1].path).toBe('new-path.jpg');
  });

  it('expone saldo pendiente en recaudo para órdenes mixtas con efectivo pendiente', async () => {
    const { service, prismaMock } = buildService();

    prismaMock.ordenServicio.findMany.mockResolvedValue([
      {
        id: 'orden-mixta',
        tecnicoId: 'tech-mixto',
        fechaVisita: new Date('2026-03-25T15:00:00.000Z'),
        desglosePago: [
          { metodo: 'TRANSFERENCIA', monto: 70000 },
          { metodo: 'EFECTIVO', monto: 30000 },
        ],
      },
    ]);

    prismaMock.tenantMembership.findMany.mockResolvedValue([
      {
        id: 'tech-mixto',
        user: { nombre: 'Yorman', apellido: 'Gabriel' },
        consignacionesTecnico: [],
      },
    ]);

    const recaudo = await service.getRecaudoTecnicos(tenantId, 'emp-1');

    const membershipQuery = prismaMock.tenantMembership.findMany.mock.calls[0][0];
    expect(membershipQuery.where).toMatchObject({
      tenantId,
      activo: true,
      id: { in: ['tech-mixto'] },
    });
    expect(membershipQuery.where).not.toHaveProperty('role');
    expect(recaudo).toHaveLength(1);
    expect(recaudo[0]).toEqual(
      expect.objectContaining({
        id: 'tech-mixto',
        saldoPendiente: 30000,
        ordenesPendientesCount: 1,
        ordenesIds: ['orden-mixta'],
      }),
    );
    expect(recaudo[0].declaraciones).toEqual([
      expect.objectContaining({
        ordenId: 'orden-mixta',
        valorDeclarado: 30000,
        tipo: 'IMPLICITO',
      }),
    ]);
  });
});
