import {
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import {
  EstadoPagoOrden,
  EstadoOrden,
  MetodoPagoBase,
} from '../generated/client/client';
import { OrdenesServicioService } from './ordenes-servicio.service';

describe('OrdenesServicioService - endurecimiento financiero', () => {
  let service: OrdenesServicioService;
  let prismaMock: any;
  let contratosMock: any;
  let supabaseMock: any;

  const baseOrden = {
    id: 'orden-1',
    valorCotizado: 100000,
    estadoServicio: EstadoOrden.NUEVO,
    estadoPago: EstadoPagoOrden.PENDIENTE,
    tenantId: 'tenant-1',
    empresaId: 'emp-1',
    clienteId: 'cli-1',
    tecnicoId: 'tech-1',
    liquidadoAt: null,
    ordenPadreId: null,
    tipoVisita: null,
    tipoFacturacion: null,
    declaracionEfectivo: null,
    consignacionOrden: null,
    comprobantePago: [],
  };

  const buildOrden = (overrides: Record<string, unknown> = {}) => ({
    ...baseOrden,
    ...overrides,
  });

  const arrangeUpdate = async ({
    orderOverrides = {},
    updateDto = {},
    updatedOverrides = {},
  }: {
    orderOverrides?: Record<string, unknown>;
    updateDto?: Record<string, unknown>;
    updatedOverrides?: Record<string, unknown>;
  }) => {
    const currentOrder = buildOrden(orderOverrides);
    const nextOrder = buildOrden({
      ...orderOverrides,
      ...updatedOverrides,
      ...updateDto,
    });

    prismaMock.ordenServicio.findFirst.mockResolvedValue(currentOrder);
    prismaMock.ordenServicio.update.mockResolvedValue(nextOrder);

    await service.update('tenant-1', 'orden-1', updateDto as any);

    return { currentOrder, nextOrder };
  };

  beforeEach(() => {
    prismaMock = {
      ordenServicio: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
      },
      empresa: { findUnique: jest.fn() },
      cliente: { findUnique: jest.fn() },
      servicio: { findFirst: jest.fn() },
      contratoCliente: { findFirst: jest.fn() },
      entidadFinanciera: { findFirst: jest.fn() },
      tenantMembership: { findUnique: jest.fn() },
      declaracionEfectivo: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
        update: jest.fn(),
      },
      consignacionOrden: {
        findFirst: jest.fn(),
      },
    };

    supabaseMock = {
      getSignedUrls: jest.fn().mockResolvedValue([]),
    };

    contratosMock = {
      getActiveByCliente: jest.fn().mockResolvedValue(null),
    };

    service = new OrdenesServicioService(prismaMock, supabaseMock, contratosMock);
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
          desglosePago: [
            { metodo: MetodoPagoBase.EFECTIVO, monto: 100000 },
          ],
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
          desglosePago: [
            { metodo: MetodoPagoBase.EFECTIVO, monto: 100000 },
          ],
          estadoServicio: EstadoOrden.TECNICO_FINALIZO,
        },
        updatedOverrides: {
          estadoServicio: EstadoOrden.TECNICO_FINALIZO,
          tecnicoId: 'tech-1',
        },
      });

      const updateCall = prismaMock.ordenServicio.update.mock.calls[0][0];

      expect(updateCall.data.valorPagado).toBe(100000);
      expect(updateCall.data.estadoPago).toBe(EstadoPagoOrden.EFECTIVO_DECLARADO);
      expect(prismaMock.declaracionEfectivo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: 'tenant-1',
            empresaId: 'emp-1',
            ordenId: 'orden-1',
            tecnicoId: 'tech-1',
            valorDeclarado: 100000,
            consignado: false,
          }),
        }),
      );
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
        } as any),
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
        },
        updatedOverrides: {
          estadoServicio: EstadoOrden.TECNICO_FINALIZO,
          tecnicoId: 'tech-1',
        },
      });

      const updateCall = prismaMock.ordenServicio.update.mock.calls[0][0];

      expect(updateCall.data.valorPagado).toBe(100000);
      expect(updateCall.data.estadoPago).toBe(EstadoPagoOrden.EFECTIVO_DECLARADO);
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
    });

    it('mantiene cortesía como cierre válido cuando se confirma explícitamente', async () => {
      await arrangeUpdate({
        updateDto: {
          valorCotizado: 100000,
          desglosePago: [
            { metodo: MetodoPagoBase.CORTESIA, monto: 100000 },
          ],
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
          desglosePago: [
            { metodo: MetodoPagoBase.CREDITO, monto: 100000 },
          ],
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
        } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rechaza edición manual de valorPagado', async () => {
      prismaMock.ordenServicio.findFirst.mockResolvedValue(baseOrden);

      await expect(
        service.update('tenant-1', 'orden-1', {
          valorPagado: 45000,
        } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rechaza mutación financiera cuando la orden ya está congelada por declaración', async () => {
      prismaMock.ordenServicio.findFirst.mockResolvedValue({
        ...baseOrden,
        declaracionEfectivo: { id: 'decl-1', consignado: false },
      });

      await expect(
        service.update('tenant-1', 'orden-1', {
          valorCotizado: 150000,
        } as any),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rechaza mutación financiera cuando la orden ya tiene consignación registrada', async () => {
      prismaMock.ordenServicio.findFirst.mockResolvedValue({
        ...baseOrden,
        consignacionOrden: { id: 'cons-1' },
      });

      await expect(
        service.update('tenant-1', 'orden-1', {
          valorCotizado: 150000,
        } as any),
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
        } as any),
      ).rejects.toBeInstanceOf(ConflictException);
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
  });

  describe('lectura con freeze financiero para UI', () => {
    it('expone financialLock en findAll y trae las relaciones mínimas para calcularlo', async () => {
      prismaMock.ordenServicio.findMany.mockResolvedValue([
        {
          ...baseOrden,
          declaracionEfectivo: { id: 'decl-1' },
          consignacionOrden: null,
          horaInicioReal: null,
          horaFinReal: null,
        },
      ]);

      const resultado = await service.findAll(
        {
          sub: 'user-1',
          tenantId: 'tenant-1',
          role: 'ADMIN',
        } as any,
        'emp-1',
      );

      expect(prismaMock.ordenServicio.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            declaracionEfectivo: expect.any(Object),
            consignacionOrden: expect.any(Object),
          }),
        }),
      );
      expect(resultado[0].financialLock).toBe(true);
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

      const resultado = await service.findOne(
        {
          sub: 'user-1',
          tenantId: 'tenant-1',
          role: 'ADMIN',
        } as any,
        'orden-1',
      );

      expect(prismaMock.ordenServicio.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            declaracionEfectivo: expect.any(Object),
            consignacionOrden: expect.any(Object),
          }),
        }),
      );
      expect(resultado.financialLock).toBe(true);
    });
  });
});
