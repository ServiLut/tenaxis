import { FinanzasController } from './contabilidad.controller';
import { RegistrarConsignacionDto } from './registrar-consignacion.dto';

describe('FinanzasController - registrar consignación JSON', () => {
  it('reenvía ordenIds como array real y comprobantePath al service', async () => {
    const contabilidadService = {
      registrarConsignacion: jest.fn().mockResolvedValue({ id: 'cons-1' }),
    };

    const controller = new FinanzasController(contabilidadService as any);

    const req = {
      user: {
        tenantId: 'tenant-1',
        membershipId: 'membership-1',
        role: 'ADMIN',
      },
    } as any;

    const dto: RegistrarConsignacionDto = {
      tecnicoId: '01906f58-8c7d-75a4-a685-3c3da2c46801',
      empresaId: '01906f58-8c7d-75a4-a685-3c3da2c46802',
      valorConsignado: 60000,
      referenciaBanco: 'REF-JSON-001',
      comprobantePath: 'consignaciones/soporte-json.jpg',
      ordenIds: [
        '01906f58-8c7d-75a4-a685-3c3da2c46803',
        '01906f58-8c7d-75a4-a685-3c3da2c46804',
      ],
      fechaConsignacion: '2026-03-26',
      observacion: 'Cierre mixto con payload JSON',
    };

    await controller.register(req, dto);

    expect(contabilidadService.registrarConsignacion).toHaveBeenCalledWith(
      'tenant-1',
      'membership-1',
      {
        tecnicoId: dto.tecnicoId,
        empresaId: dto.empresaId,
        valorConsignado: dto.valorConsignado,
        referenciaBanco: dto.referenciaBanco,
        comprobantePath: dto.comprobantePath,
        ordenIds: dto.ordenIds,
        fechaConsignacion: dto.fechaConsignacion,
        observacion: dto.observacion,
      },
    );
  });
});
