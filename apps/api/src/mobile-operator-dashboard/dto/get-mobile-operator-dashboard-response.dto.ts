export class OperatorDashboardSummaryDto {
  serviciosHoy!: number;
  programadosHoy!: number;
  finalizadosHoy!: number;
  pendientesLiquidarHoy!: number;
  canceladosHoy!: number;
}

export class OperatorDashboardQueueDto {
  pendientes!: number;
  vencidos!: number;
}

export class OperatorDashboardAlertsDto {
  urgentesPendientes!: number;
  criticasPendientes!: number;
  serviciosSinEvidencia!: number;
  evidenciasSubidasHoy!: number;
}

export class OperatorDashboardActivityDto {
  sesionActiva!: boolean;
  horaInicioJornada!: string | null;
  duracionMin!: number;
  tiempoInactivo!: number;
}

export class OperatorDashboardCashCollectionDto {
  saldoPendiente!: number;
  ordenesPendientesCount!: number;
  ultimaTransferencia!: string | null;
  diasSinTransferir!: number;
}

export class OperatorDashboardNextServiceDto {
  id!: string;
  fechaVisita!: string;
  estadoServicio!: string;
  tipoVisita!: string | null;
  urgencia!: string | null;
  clienteNombre!: string | null;
}

export class OperatorDashboardResponseDto {
  summary!: OperatorDashboardSummaryDto;
  queue!: OperatorDashboardQueueDto;
  alerts!: OperatorDashboardAlertsDto;
  activity!: OperatorDashboardActivityDto;
  cashCollection!: OperatorDashboardCashCollectionDto;
  nextService!: OperatorDashboardNextServiceDto | null;
}
