import { BadRequestException, ConflictException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { ContratosClienteService } from '../contratos-cliente/contratos-cliente.service';
import {
  EstadoPagoOrden,
  EstadoOrden,
  MetodoPagoBase,
  Role,
  TipoVisita,
} from '../generated/client/client';
import type { PrismaService } from '../prisma/prisma.service';
import type { PushNotificationsService } from '../push-notifications/push-notifications.service';
import type { SupabaseService } from '../supabase/supabase.service';
import { OrdenesServicioService } from './ordenes-servicio.service';

describe('OrdenesServicioService - endurecimiento financiero', () => {
  let service: OrdenesServicioService;
  let prismaMock: PrismaMock;
  let contratosMock: ContratosClienteMock;
  let supabaseMock: SupabaseMock;
  let pushNotificationsMock: {
    sendServiceAssignedNotification: jest.Mock;
  };
  let configServiceMock: {
    get: jest.Mock;
  };

  type ServiceUser = Parameters<OrdenesServicioService['findAll']>[0];
  type ServiceUpdateDto = Parameters<OrdenesServicioService['update']>[2];
  type TestUpdateDto = ServiceUpdateDto & {
    estadoPago?: EstadoPagoOrden;
    valorCotizado?: number;
    valorPagado?: number;
  };

  type ComprobantePagoRecord = {
    path: string;
    monto: number;
    referenciaPago?: string | null;
    fechaPago?: string | Date | null;
  };

  type DesglosePagoRecord = {
    metodo: MetodoPagoBase;
    monto: number;
    banco?: string | null;
    referencia?: string | null;
    observacion?: string | null;
  };

  type OrdenServicioRecord = {
    id: string;
    valorCotizado: number;
    valorPagado?: number | null;
    estadoServicio: EstadoOrden;
    estadoPago: EstadoPagoOrden;
    tenantId: string;
    empresaId: string;
    clienteId: string;
    tecnicoId: string;
    direccionId?: string | null;
    direccionTexto?: string | null;
    liquidadoAt: Date | null;
    liquidadoPor?: { disconnect: true } | null;
    ordenPadreId: string | null;
    tipoVisita: string | null;
    tipoFacturacion: string | null;
    declaracionEfectivo: { id: string; consignado?: boolean } | null;
    consignacionOrden: { id: string } | null;
    comprobantePago: string | ComprobantePagoRecord[];
    desglosePago?: DesglosePagoRecord[];
    observacion?: string | null;
    horaInicioReal?: Date | string | null;
    horaFinReal?: Date | string | null;
    referenciaPago?: string | null;
    fechaPago?: Date | string | null;
  };

  type OrdenServicioUpdateData = {
    valorPagado?: number;
    estadoPago?: EstadoPagoOrden;
    estadoServicio?: EstadoOrden;
    liquidadoAt?: Date | null;
    liquidadoPor?: { disconnect: true } | null;
    observacion?: string;
    direccion?: { connect: { id: string } };
    direccionTexto?: string;
    comprobantePago?: ComprobantePagoRecord[];
    referenciaPago?: string;
    fechaPago?: string | Date;
  };

  type FindArgs = {
    where?: Record<string, unknown>;
    include?: Record<string, unknown>;
  };

  type OrdenServicioUpdateArgs = {
    data: OrdenServicioUpdateData;
  };

  type DeclaracionEfectivoCreateArgs = {
    data: {
      tenantId: string;
      empresaId: string;
      ordenId: string;
      tecnicoId: string;
      valorDeclarado: number;
      consignado: boolean;
    };
  };

  type MockFn<TArgs extends unknown[], TReturn> = jest.MockedFunction<
    (...args: TArgs) => TReturn
  >;

  const mockFn = <TArgs extends unknown[], TReturn>() =>
    jest.fn() as MockFn<TArgs, TReturn>;

  type PrismaMock = {
    ordenServicio: {
      findFirst: MockFn<[FindArgs], Promise<OrdenServicioRecord | null>>;
      findMany: MockFn<[FindArgs], Promise<OrdenServicioRecord[]>>;
      update: MockFn<[OrdenServicioUpdateArgs], Promise<OrdenServicioRecord>>;
      count: MockFn<[FindArgs?], Promise<number>>;
      create: MockFn<[Record<string, unknown>], Promise<OrdenServicioRecord>>;
    };
    empresa: {
      findUnique: MockFn<[FindArgs], Promise<unknown>>;
    };
    direccion: {
      findUnique: MockFn<[FindArgs], Promise<unknown>>;
    };
    cliente: {
      findUnique: MockFn<[FindArgs], Promise<unknown>>;
    };
    servicio: {
      findFirst: MockFn<[FindArgs], Promise<unknown>>;
    };
    contratoCliente: {
      findFirst: MockFn<[FindArgs], Promise<unknown>>;
    };
    entidadFinanciera: {
      findFirst: MockFn<[FindArgs], Promise<unknown>>;
    };
    tenantMembership: {
      findUnique: MockFn<[FindArgs], Promise<unknown>>;
    };
    declaracionEfectivo: {
      findUnique: MockFn<
        [FindArgs],
        Promise<OrdenServicioRecord['declaracionEfectivo']>
      >;
      create: MockFn<[DeclaracionEfectivoCreateArgs], Promise<unknown>>;
      update: MockFn<[Record<string, unknown>], Promise<unknown>>;
    };
    consignacionOrden: {
      findFirst: MockFn<[FindArgs], Promise<unknown>>;
    };
  };

  type SupabaseMock = {
    getSignedUrls: MockFn<[unknown?], Promise<unknown[]>>;
  };

  type ContratosClienteMock = {
    getActiveByCliente: MockFn<[string, string?], Promise<unknown>>;
  };

  const baseOrden: OrdenServicioRecord = {
    id: 'orden-1',
    valorCotizado: 100000,
    estadoServicio: EstadoOrden.NUEVO,
    estadoPago: EstadoPagoOrden.PENDIENTE,
    tenantId: 'tenant-1',
    empresaId: 'emp-1',
    clienteId: 'cli-1',
    tecnicoId: 'tech-1',
    direccionId: 'dir-1',
    direccionTexto: 'Calle 1 # 2-3',
    liquidadoAt: null,
    ordenPadreId: null,
    tipoVisita: null,
    tipoFacturacion: null,
    declaracionEfectivo: null,
    consignacionOrden: null,
    comprobantePago: [],
  };

  const buildOrden = (
    overrides: Partial<OrdenServicioRecord> = {},
  ): OrdenServicioRecord => ({
    ...baseOrden,
    ...overrides,
  });

  const arrangeUpdate = async ({
    orderOverrides = {},
    updateDto = {},
    updatedOverrides = {},
  }: {
    orderOverrides?: Partial<OrdenServicioRecord>;
    updateDto?: TestUpdateDto;
    updatedOverrides?: Partial<OrdenServicioRecord>;
  }) => {
    const currentOrder = buildOrden(orderOverrides);
    const nextOrder = buildOrden({
      ...orderOverrides,
      ...updatedOverrides,
      ...updateDto,
    });

    prismaMock.ordenServicio.findFirst.mockResolvedValue(currentOrder);
    prismaMock.ordenServicio.update.mockResolvedValue(nextOrder);

    await service.update('tenant-1', 'orden-1', updateDto);

    return { currentOrder, nextOrder };
  };

  const adminUser: ServiceUser = {
    sub: 'user-1',
    email: 'admin@tenant.test',
    tenantId: 'tenant-1',
    role: Role.ADMIN,
  };

  beforeEach(() => {
    prismaMock = {
      ordenServicio: {
        findFirst: mockFn(),
        findMany: mockFn(),
        update: mockFn(),
        count: mockFn(),
        create: mockFn(),
      },
      empresa: { findUnique: mockFn() },
      direccion: { findUnique: mockFn() },
      cliente: { findUnique: mockFn() },
      servicio: { findFirst: mockFn() },
      contratoCliente: { findFirst: mockFn() },
      entidadFinanciera: { findFirst: mockFn() },
      tenantMembership: { findUnique: mockFn() },
      declaracionEfectivo: {
        findUnique: mockFn(),
        create: mockFn(),
        update: mockFn(),
      },
      consignacionOrden: {
        findFirst: mockFn(),
      },
    };

    supabaseMock = {
      getSignedUrls: mockFn(),
    };

    contratosMock = {
      getActiveByCliente: mockFn(),
    };
    pushNotificationsMock = {
      sendServiceAssignedNotification: jest.fn().mockResolvedValue(true),
    };
    configServiceMock = {
      get: jest.fn().mockReturnValue(undefined),
    };

    prismaMock.declaracionEfectivo.findUnique.mockResolvedValue(null);
    prismaMock.direccion.findUnique.mockResolvedValue({
      id: 'dir-2',
      direccion: 'Carrera 10 # 20-30',
    });
    supabaseMock.getSignedUrls.mockResolvedValue([]);
    contratosMock.getActiveByCliente.mockResolvedValue(null);

    service = new OrdenesServicioService(
      prismaMock as unknown as PrismaService,
      supabaseMock as unknown as SupabaseService,
      contratosMock as unknown as ContratosClienteService,
      pushNotificationsMock as unknown as PushNotificationsService,
      configServiceMock as unknown as ConfigService,
    );
  });

  describe('cálculo de estado de pago', () => {
    it('no marca PAGADO cuando solo hay transferencia planeada y no existe evidencia', async () => {
      await arrangeUpdate({
        updateDto: {
          desglosePago: [
            { metodo: MetodoPagoBase.TRANSFERENCIA, monto: 100000 },
          ],
          estadoServicio: EstadoOrden.NUEVO,
        },
      });

      const updateCall = prismaMock.ordenServicio.update.mock.calls[0][0];

      expect(updateCall.data.valorPagado).toBeUndefined();
      expect(updateCall.data.estadoPago).toBeUndefined();
    });

    it('no marca PARCIAL cuando la transferencia es solo un plan cargado en edición', async () => {
      await arrangeUpdate({
        orderOverrides: { valorCotizado: 120000 },
        updateDto: {
          desglosePago: [
            { metodo: MetodoPagoBase.TRANSFERENCIA, monto: 50000 },
          ],
          estadoServicio: EstadoOrden.NUEVO,
        },
      });

      const updateCall = prismaMock.ordenServicio.update.mock.calls[0][0];

      expect(updateCall.data.valorPagado).toBeUndefined();
      expect(updateCall.data.estadoPago).toBeUndefined();
    });

    it('mantiene el breakdown como plan cuando solo hay efectivo y el servicio no llegó al recaudo', async () => {
      await arrangeUpdate({
        updateDto: {
          desglosePago: [{ metodo: MetodoPagoBase.EFECTIVO, monto: 100000 }],
          estadoServicio: EstadoOrden.NUEVO,
        },
      });

      const updateCall = prismaMock.ordenServicio.update.mock.calls[0][0];

      expect(updateCall.data.valorPagado).toBeUndefined();
      expect(updateCall.data.estadoPago).toBeUndefined();
      expect(prismaMock.declaracionEfectivo.create).not.toHaveBeenCalled();
    });

    it('marca EFECTIVO_DECLARADO cuando solo hay efectivo y el servicio ya finalizó', async () => {
      await arrangeUpdate({
        updateDto: {
          desglosePago: [{ metodo: MetodoPagoBase.EFECTIVO, monto: 100000 }],
          estadoServicio: EstadoOrden.TECNICO_FINALIZO,
          confirmarMovimientoFinanciero: true,
        },
        updatedOverrides: {
          estadoServicio: EstadoOrden.TECNICO_FINALIZO,
          tecnicoId: 'tech-1',
        },
      });

      const updateCall = prismaMock.ordenServicio.update.mock.calls[0][0];

      expect(updateCall.data.valorPagado).toBe(100000);
      expect(updateCall.data.estadoPago).toBe(
        EstadoPagoOrden.EFECTIVO_DECLARADO,
      );
      const declaracionCreateCall =
        prismaMock.declaracionEfectivo.create.mock.calls[0][0];

      expect(declaracionCreateCall.data).toEqual(
        expect.objectContaining({
          tenantId: 'tenant-1',
          empresaId: 'emp-1',
          ordenId: 'orden-1',
          tecnicoId: 'tech-1',
          valorDeclarado: 100000,
          consignado: false,
        }),
      );
    });

    it('mantiene el efectivo como plan aunque el servicio quede finalizado si no hubo confirmación financiera explícita', async () => {
      await arrangeUpdate({
        orderOverrides: {
          tipoVisita: TipoVisita.DIAGNOSTICO_INICIAL,
        },
        updateDto: {
          desglosePago: [{ metodo: MetodoPagoBase.EFECTIVO, monto: 100000 }],
          estadoServicio: EstadoOrden.TECNICO_FINALIZO,
          tipoVisita: TipoVisita.DIAGNOSTICO_INICIAL,
        },
        updatedOverrides: {
          tipoVisita: TipoVisita.DIAGNOSTICO_INICIAL,
          estadoServicio: EstadoOrden.TECNICO_FINALIZO,
          tecnicoId: 'tech-1',
        },
      });

      const updateCall = prismaMock.ordenServicio.update.mock.calls[0][0];

      expect(updateCall.data.valorPagado).toBe(0);
      expect(updateCall.data.estadoPago).toBe(EstadoPagoOrden.PENDIENTE);
      expect(prismaMock.declaracionEfectivo.create).not.toHaveBeenCalled();
    });

    it('no convierte un pago mixto planeado en pago real mientras no haya registro explícito', async () => {
      await arrangeUpdate({
        updateDto: {
          desglosePago: [
            { metodo: MetodoPagoBase.TRANSFERENCIA, monto: 50000 },
            { metodo: MetodoPagoBase.EFECTIVO, monto: 50000 },
          ],
          estadoServicio: EstadoOrden.NUEVO,
        },
      });

      const updateCall = prismaMock.ordenServicio.update.mock.calls[0][0];

      expect(updateCall.data.valorPagado).toBeUndefined();
      expect(updateCall.data.estadoPago).toBeUndefined();
    });

    it('rechaza cierre mixto sin evidencia de la transferencia', async () => {
      prismaMock.ordenServicio.findFirst.mockResolvedValue(baseOrden);

      await expect(
        service.update('tenant-1', 'orden-1', {
          desglosePago: [
            { metodo: MetodoPagoBase.TRANSFERENCIA, monto: 40000 },
            { metodo: MetodoPagoBase.EFECTIVO, monto: 60000 },
          ],
          estadoServicio: EstadoOrden.TECNICO_FINALIZO,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('marca EFECTIVO_DECLARADO cuando el mixto ya cubre todo, el servicio finalizó y la transferencia trae evidencia', async () => {
      await arrangeUpdate({
        updateDto: {
          desglosePago: [
            {
              metodo: MetodoPagoBase.TRANSFERENCIA,
              monto: 40000,
              referencia: 'TRX-001',
            },
            { metodo: MetodoPagoBase.EFECTIVO, monto: 60000 },
          ],
          estadoServicio: EstadoOrden.TECNICO_FINALIZO,
          comprobantePago: 'ordenes/comp.png',
          fechaPago: '2026-03-25',
          referenciaPago: 'TRX-001',
          confirmarMovimientoFinanciero: true,
        },
        updatedOverrides: {
          estadoServicio: EstadoOrden.TECNICO_FINALIZO,
          tecnicoId: 'tech-1',
        },
      });

      const updateCall = prismaMock.ordenServicio.update.mock.calls[0][0];

      expect(updateCall.data.valorPagado).toBe(100000);
      expect(updateCall.data.estadoPago).toBe(
        EstadoPagoOrden.EFECTIVO_DECLARADO,
      );
      expect(prismaMock.declaracionEfectivo.create).toHaveBeenCalledTimes(1);
    });

    it('permite confirmar transferencia completa con evidencia explícita', async () => {
      await arrangeUpdate({
        updateDto: {
          desglosePago: [
            {
              metodo: MetodoPagoBase.TRANSFERENCIA,
              monto: 100000,
              referencia: 'TRX-999',
            },
          ],
          estadoServicio: EstadoOrden.LIQUIDADO,
          comprobantePago: 'ordenes/comp.png',
          fechaPago: '2026-03-25',
          referenciaPago: 'TRX-999',
        },
        updatedOverrides: {
          estadoServicio: EstadoOrden.LIQUIDADO,
        },
      });

      const updateCall = prismaMock.ordenServicio.update.mock.calls[0][0];

      expect(updateCall.data.valorPagado).toBe(100000);
      expect(updateCall.data.estadoPago).toBe(EstadoPagoOrden.PAGADO);
      expect(updateCall.data.estadoServicio).toBe(EstadoOrden.LIQUIDADO);
      expect(updateCall.data.liquidadoAt).toBeInstanceOf(Date);
    });

    it('no marca LIQUIDADO una transferencia parcial aunque tenga evidencia', async () => {
      await arrangeUpdate({
        orderOverrides: { valorCotizado: 100000 },
        updateDto: {
          desglosePago: [
            {
              metodo: MetodoPagoBase.TRANSFERENCIA,
              monto: 10000,
              referencia: 'TRX-010',
            },
          ],
          estadoServicio: EstadoOrden.LIQUIDADO,
          comprobantePago: 'ordenes/comp-parcial.png',
          fechaPago: '2026-03-25',
          referenciaPago: 'TRX-010',
        },
        updatedOverrides: {
          estadoServicio: EstadoOrden.TECNICO_FINALIZO,
          estadoPago: EstadoPagoOrden.PARCIAL,
          liquidadoAt: null,
        },
      });

      const updateCall = prismaMock.ordenServicio.update.mock.calls[0][0];

      expect(updateCall.data.valorPagado).toBe(10000);
      expect(updateCall.data.estadoPago).toBe(EstadoPagoOrden.PARCIAL);
      expect(updateCall.data.estadoServicio).toBe(EstadoOrden.TECNICO_FINALIZO);
      expect(updateCall.data.liquidadoAt).toBeNull();
      expect(updateCall.data.liquidadoPor).toEqual({ disconnect: true });
    });

    it('acumula anticipo y saldo por transferencia sin pisar el primer comprobante legacy', async () => {
      await arrangeUpdate({
        orderOverrides: {
          valorCotizado: 100000,
          valorPagado: 10000,
          estadoPago: EstadoPagoOrden.PARCIAL,
          estadoServicio: EstadoOrden.TECNICO_FINALIZO,
          desglosePago: [
            { metodo: MetodoPagoBase.TRANSFERENCIA, monto: 100000 },
          ],
          comprobantePago: 'ordenes/comp-1.png',
          referenciaPago: 'TRX-001',
          fechaPago: new Date('2026-03-25T05:00:00.000Z'),
        },
        updateDto: {
          estadoServicio: EstadoOrden.LIQUIDADO,
          transferencias: [
            {
              monto: 90000,
              comprobantePath: 'ordenes/comp-2.png',
              referenciaPago: 'TRX-002',
              fechaPago: '2026-03-26',
            },
          ],
        },
        updatedOverrides: {
          estadoServicio: EstadoOrden.LIQUIDADO,
          estadoPago: EstadoPagoOrden.PAGADO,
          valorPagado: 100000,
        },
      });

      const updateCall = prismaMock.ordenServicio.update.mock.calls[0][0];
      const comprobantes = updateCall.data.comprobantePago as Array<
        Record<string, unknown>
      >;

      expect(comprobantes).toHaveLength(2);
      expect(comprobantes[0]).toEqual(
        expect.objectContaining({
          path: 'ordenes/comp-1.png',
          monto: 10000,
          referenciaPago: 'TRX-001',
        }),
      );
      expect(comprobantes[1]).toEqual(
        expect.objectContaining({
          path: 'ordenes/comp-2.png',
          monto: 90000,
          referenciaPago: 'TRX-002',
        }),
      );
      expect(updateCall.data.valorPagado).toBe(100000);
      expect(updateCall.data.estadoPago).toBe(EstadoPagoOrden.PAGADO);
      expect(updateCall.data.estadoServicio).toBe(EstadoOrden.LIQUIDADO);
    });

    it('mantiene la orden abierta cuando varias transferencias todavía no cubren el total', async () => {
      await arrangeUpdate({
        orderOverrides: {
          valorCotizado: 100000,
          valorPagado: 10000,
          estadoPago: EstadoPagoOrden.PARCIAL,
          estadoServicio: EstadoOrden.TECNICO_FINALIZO,
          desglosePago: [
            { metodo: MetodoPagoBase.TRANSFERENCIA, monto: 100000 },
          ],
          comprobantePago: [
            {
              path: 'ordenes/comp-1.png',
              monto: 10000,
              referenciaPago: 'TRX-001',
              fechaPago: '2026-03-25T05:00:00.000Z',
            },
          ],
          referenciaPago: 'TRX-001',
          fechaPago: new Date('2026-03-25T05:00:00.000Z'),
        },
        updateDto: {
          estadoServicio: EstadoOrden.LIQUIDADO,
          transferencias: [
            {
              monto: 20000,
              comprobantePath: 'ordenes/comp-2.png',
              referenciaPago: 'TRX-002',
              fechaPago: '2026-03-26',
            },
          ],
        },
        updatedOverrides: {
          estadoServicio: EstadoOrden.TECNICO_FINALIZO,
          estadoPago: EstadoPagoOrden.PARCIAL,
          valorPagado: 30000,
          liquidadoAt: null,
        },
      });

      const updateCall = prismaMock.ordenServicio.update.mock.calls[0][0];

      expect(updateCall.data.valorPagado).toBe(30000);
      expect(updateCall.data.estadoPago).toBe(EstadoPagoOrden.PARCIAL);
      expect(updateCall.data.estadoServicio).toBe(EstadoOrden.TECNICO_FINALIZO);
      expect(updateCall.data.liquidadoAt).toBeNull();
      expect(updateCall.data.liquidadoPor).toEqual({ disconnect: true });
    });

    it('mantiene mixtos funcionales cuando la transferencia ya estaba registrada y el efectivo se declara al finalizar', async () => {
      await arrangeUpdate({
        orderOverrides: {
          valorCotizado: 100000,
          valorPagado: 40000,
          estadoPago: EstadoPagoOrden.PARCIAL,
          estadoServicio: EstadoOrden.PROCESO,
          desglosePago: [
            { metodo: MetodoPagoBase.TRANSFERENCIA, monto: 40000 },
            { metodo: MetodoPagoBase.EFECTIVO, monto: 60000 },
          ],
          comprobantePago: [
            {
              path: 'ordenes/comp-1.png',
              monto: 40000,
              referenciaPago: 'TRX-001',
              fechaPago: '2026-03-25T05:00:00.000Z',
            },
          ],
          referenciaPago: 'TRX-001',
          fechaPago: new Date('2026-03-25T05:00:00.000Z'),
        },
        updateDto: {
          estadoServicio: EstadoOrden.TECNICO_FINALIZO,
          confirmarMovimientoFinanciero: true,
        },
        updatedOverrides: {
          estadoServicio: EstadoOrden.TECNICO_FINALIZO,
          estadoPago: EstadoPagoOrden.EFECTIVO_DECLARADO,
          valorPagado: 100000,
          tecnicoId: 'tech-1',
        },
      });

      const updateCall = prismaMock.ordenServicio.update.mock.calls[0][0];

      expect(updateCall.data.valorPagado).toBe(100000);
      expect(updateCall.data.estadoPago).toBe(
        EstadoPagoOrden.EFECTIVO_DECLARADO,
      );
      expect(prismaMock.declaracionEfectivo.create).toHaveBeenCalledTimes(1);
    });

    it('mantiene cortesía como cierre válido cuando se confirma explícitamente', async () => {
      await arrangeUpdate({
        updateDto: {
          valorCotizado: 100000,
          desglosePago: [{ metodo: MetodoPagoBase.CORTESIA, monto: 100000 }],
          estadoServicio: EstadoOrden.LIQUIDADO,
        },
        updatedOverrides: {
          estadoServicio: EstadoOrden.LIQUIDADO,
        },
      });

      const updateCall = prismaMock.ordenServicio.update.mock.calls[0][0];

      expect(updateCall.data.valorPagado).toBe(0);
      expect(updateCall.data.estadoPago).toBe(EstadoPagoOrden.CORTESIA);
    });

    it('mantiene crédito como parcial cuando se confirma explícitamente', async () => {
      await arrangeUpdate({
        updateDto: {
          valorCotizado: 100000,
          desglosePago: [{ metodo: MetodoPagoBase.CREDITO, monto: 100000 }],
          estadoServicio: EstadoOrden.TECNICO_FINALIZO,
        },
        updatedOverrides: {
          estadoServicio: EstadoOrden.TECNICO_FINALIZO,
        },
      });

      const updateCall = prismaMock.ordenServicio.update.mock.calls[0][0];

      expect(updateCall.data.valorPagado).toBe(0);
      expect(updateCall.data.estadoPago).toBe(EstadoPagoOrden.PARCIAL);
    });
  });

  describe('validaciones de mutación', () => {
    it('rechaza edición manual de estadoPago', async () => {
      prismaMock.ordenServicio.findFirst.mockResolvedValue(baseOrden);

      await expect(
        service.update('tenant-1', 'orden-1', {
          estadoPago: EstadoPagoOrden.CONCILIADO,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rechaza edición manual de valorPagado', async () => {
      prismaMock.ordenServicio.findFirst.mockResolvedValue(baseOrden);

      await expect(
        service.update('tenant-1', 'orden-1', {
          valorPagado: 45000,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('permite mutación financiera cuando solo existe declaración y la orden sigue abierta', async () => {
      prismaMock.ordenServicio.findFirst.mockResolvedValue({
        ...baseOrden,
        estadoServicio: EstadoOrden.TECNICO_FINALIZO,
        estadoPago: EstadoPagoOrden.PARCIAL,
        declaracionEfectivo: { id: 'decl-1', consignado: false },
      });
      prismaMock.ordenServicio.update.mockResolvedValue(
        buildOrden({
          estadoServicio: EstadoOrden.TECNICO_FINALIZO,
          estadoPago: EstadoPagoOrden.PARCIAL,
          declaracionEfectivo: { id: 'decl-1', consignado: false },
          valorCotizado: 150000,
        }),
      );

      await service.update('tenant-1', 'orden-1', {
        valorCotizado: 150000,
      });

      expect(prismaMock.ordenServicio.update).toHaveBeenCalled();
    });

    it('rechaza mutación financiera cuando la orden ya tiene consignación registrada', async () => {
      prismaMock.ordenServicio.findFirst.mockResolvedValue({
        ...baseOrden,
        consignacionOrden: { id: 'cons-1' },
      });

      await expect(
        service.update('tenant-1', 'orden-1', {
          valorCotizado: 150000,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rechaza mutación financiera cuando la orden ya quedó liquidada', async () => {
      prismaMock.ordenServicio.findFirst.mockResolvedValue({
        ...baseOrden,
        liquidadoAt: new Date(),
      });

      await expect(
        service.update('tenant-1', 'orden-1', {
          valorCotizado: 150000,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('permite completar metadata de transferencia en una orden PAGADO que aún no fue liquidada', async () => {
      await arrangeUpdate({
        orderOverrides: {
          estadoServicio: EstadoOrden.TECNICO_FINALIZO,
          estadoPago: EstadoPagoOrden.PAGADO,
          valorPagado: 195000,
          desglosePago: [
            { metodo: MetodoPagoBase.TRANSFERENCIA, monto: 195000 },
          ],
          comprobantePago: 'ordenes/comp-incomplete.png',
          referenciaPago: null,
          fechaPago: null,
          liquidadoAt: null,
        },
        updateDto: {
          desglosePago: [
            { metodo: MetodoPagoBase.TRANSFERENCIA, monto: 195000 },
          ],
          estadoServicio: EstadoOrden.LIQUIDADO,
          comprobantePago: 'ordenes/comp-incomplete.png',
          referenciaPago: 'M10704553',
          fechaPago: '2026-04-09',
          transferencias: [
            {
              monto: 195000,
              comprobantePath: 'ordenes/comp-incomplete.png',
              referenciaPago: 'M10704553',
              fechaPago: '2026-04-09',
            },
          ],
          confirmarMovimientoFinanciero: true,
          observacionFinal: 'se instalo filtro en 195000',
        },
        updatedOverrides: {
          estadoServicio: EstadoOrden.LIQUIDADO,
          estadoPago: EstadoPagoOrden.PAGADO,
          liquidadoAt: new Date('2026-04-09T12:00:00.000Z'),
          referenciaPago: 'M10704553',
          fechaPago: new Date('2026-04-09T05:00:00.000Z'),
        },
      });

      const updateCall = prismaMock.ordenServicio.update.mock.calls[0][0];

      expect(updateCall.data.estadoServicio).toBe(EstadoOrden.LIQUIDADO);
      expect(updateCall.data.referenciaPago).toBe('M10704553');
      expect(updateCall.data.fechaPago).toBeInstanceOf(Date);
    });
  });

  describe('cambios operativos sin tocar finanzas', () => {
    it('permite cambiar el estado operativo cuando no hay bloqueo financiero', async () => {
      await arrangeUpdate({
        updateDto: {
          estadoServicio: EstadoOrden.PROCESO,
          observacion: 'Reasignación operativa',
        },
      });

      const updateCall = prismaMock.ordenServicio.update.mock.calls[0][0];

      expect(updateCall.data.estadoServicio).toBe(EstadoOrden.PROCESO);
      expect(updateCall.data.observacion).toBe('Reasignación operativa');
    });

    it('persiste direccionId y direccionTexto al editar la orden', async () => {
      await arrangeUpdate({
        updateDto: {
          direccionId: 'dir-2',
        },
        updatedOverrides: {
          direccionId: 'dir-2',
          direccionTexto: 'Carrera 10 # 20-30',
        },
      });

      const updateCall = prismaMock.ordenServicio.update.mock.calls[0][0];

      expect(updateCall.data.direccion).toEqual({ connect: { id: 'dir-2' } });
      expect(updateCall.data.direccionTexto).toBe('Carrera 10 # 20-30');
    });

    it('permite liquidar operativamente una orden ya pagada sin reabrir finanzas', async () => {
      await arrangeUpdate({
        orderOverrides: {
          estadoServicio: EstadoOrden.TECNICO_FINALIZO,
          estadoPago: EstadoPagoOrden.PAGADO,
          valorPagado: 100000,
          desglosePago: [
            { metodo: MetodoPagoBase.TRANSFERENCIA, monto: 100000 },
          ],
          comprobantePago: [
            {
              path: 'ordenes/comp-1.png',
              monto: 100000,
              referenciaPago: 'TRX-PAID-1',
              fechaPago: '2026-03-25',
            },
          ],
        },
        updateDto: {
          estadoServicio: EstadoOrden.LIQUIDADO,
          observacion: 'Cierre operativo final',
        },
        updatedOverrides: {
          estadoServicio: EstadoOrden.LIQUIDADO,
          estadoPago: EstadoPagoOrden.PAGADO,
          liquidadoAt: new Date('2026-03-26T10:00:00.000Z'),
        },
      });

      const updateCall = prismaMock.ordenServicio.update.mock.calls[0][0];

      expect(updateCall.data.estadoServicio).toBe(EstadoOrden.LIQUIDADO);
      expect(updateCall.data.estadoPago).toBe(EstadoPagoOrden.PAGADO);
      expect(updateCall.data.liquidadoAt).toBeInstanceOf(Date);
    });
  });

  describe('lectura con freeze financiero para UI', () => {
    it('no expone financialLock en findAll cuando la orden solo tiene declaración y sigue parcialmente abierta', async () => {
      prismaMock.ordenServicio.findMany.mockResolvedValue([
        {
          ...baseOrden,
          estadoServicio: EstadoOrden.TECNICO_FINALIZO,
          estadoPago: EstadoPagoOrden.PARCIAL,
          declaracionEfectivo: { id: 'decl-1' },
          consignacionOrden: null,
          horaInicioReal: null,
          horaFinReal: null,
        },
      ]);

      const resultado = await service.findAll(adminUser, 'emp-1');

      const findManyCall = prismaMock.ordenServicio.findMany.mock.calls[0][0];

      expect(findManyCall.include).toBeDefined();
      expect(findManyCall.include?.declaracionEfectivo).toBeDefined();
      expect(findManyCall.include?.consignacionOrden).toBeDefined();
      expect(resultado.data[0]?.financialLock).toBe(false);
    });

    it('expone financialLock en findOne cuando la orden ya quedó congelada por consignación', async () => {
      prismaMock.ordenServicio.findFirst.mockResolvedValue({
        ...baseOrden,
        liquidadoAt: null,
        declaracionEfectivo: null,
        consignacionOrden: { id: 'cons-1' },
        horaInicioReal: null,
        horaFinReal: null,
      });

      const resultado = await service.findOne(adminUser, 'orden-1');

      const findFirstCall = prismaMock.ordenServicio.findFirst.mock.calls[0][0];

      expect(findFirstCall.include).toBeDefined();
      expect(findFirstCall.include?.declaracionEfectivo).toBeDefined();
      expect(findFirstCall.include?.consignacionOrden).toBeDefined();
      expect(resultado.financialLock).toBe(true);
    });
  });
});
