import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import IORedis, { RedisOptions } from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { QueryClientesDashboardDto } from './dto/query-clientes-dashboard.dto';
import { QueryClientesSearchDto } from './dto/query-clientes-search.dto';
import {
  Cliente,
  ClasificacionCliente,
  EstadoContratoCliente,
  SegmentoCliente,
  NivelRiesgo,
  Prisma,
} from '../generated/client/client';
import { startOfBogotaDayUtc } from '../common/utils/timezone.util';
import { JwtPayload } from '../auth/jwt-payload.interface';
import {
  getPrismaAccessFilter,
  PrismaAccessFilter,
} from '../common/utils/access-control.util';

type ClienteWithRelations = Cliente & {
  direcciones?: any[];
  vehiculos?: any[];
  configuracionesOperativas?: any[];
  ordenesServicio?: Array<{
    id: string;
    estadoPago?: string | null;
    valorCotizado?: Prisma.Decimal | number | null;
    valorPagado?: Prisma.Decimal | number | null;
    valorRepuestos?: Prisma.Decimal | number | null;
  }>;
  empresa?: any;
  tenant?: any;
  tipoInteres?: any;
  dashboardSegments?: DashboardSegmentKey[];
};

type DashboardSegmentKey =
  | 'riesgoFuga'
  | 'upsellPotencial'
  | 'dormidos'
  | 'operacionEstable';

type DashboardSegmentedSummary = Record<
  DashboardSegmentKey,
  { count: number; data: ClienteWithRelations[] }
>;

interface DashboardPaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface DashboardOverview {
  total: number;
  empresas: number;
  oro: number;
  riesgoCritico: number;
  avgScore: number;
}

interface DashboardKpisResponse {
  overview: DashboardOverview;
  segmentacion: {
    riesgoFuga: { count: number };
    upsellPotencial: { count: number };
    dormidos: { count: number };
    operacionEstable: { count: number };
  };
  meta: {
    cached: boolean;
    generatedAt: string;
    cacheTtlSeconds: number;
  };
}

interface NormalizedDashboardQuery {
  page: number;
  limit: number;
  search: string;
  segment: 'all' | DashboardSegmentKey;
  sort: string;
  dir: 'asc' | 'desc';
  empresas: string[];
  dept: string;
  muni: string;
  barrio: string;
  class: string;
  seg: string;
  risk: string;
  from: string;
  to: string;
  onlySinVisita: boolean;
  onlyWithPendingPayments: boolean;
  onlySinServicios: boolean;
}

interface ClienteIdRow {
  id: string;
}

const clienteSearchSelect = {
  id: true,
  tipoCliente: true,
  nombre: true,
  apellido: true,
  razonSocial: true,
  telefono: true,
  telefono2: true,
  numeroDocumento: true,
  nit: true,
  correo: true,
  empresaId: true,
  createdAt: true,
  direcciones: {
    select: {
      id: true,
      direccion: true,
      barrio: true,
      nombreSede: true,
      municipioId: true,
      departmentId: true,
      linkMaps: true,
      piso: true,
      bloque: true,
      unidad: true,
      tipoUbicacion: true,
      clasificacionPunto: true,
      horarioInicio: true,
      horarioFin: true,
      restricciones: true,
      nombreContacto: true,
      telefonoContacto: true,
      cargoContacto: true,
      municipioRel: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
} as const satisfies Prisma.ClienteSelect;

export type ClienteSearchResult = Prisma.ClienteGetPayload<{
  select: typeof clienteSearchSelect;
}>;

@Injectable()
export class ClientesService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ClientesService.name);
  private redis: IORedis | null = null;
  private readonly dashboardKpisCacheTtlSeconds = 60 * 10;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit() {
    try {
      this.redis = new IORedis(this.getRedisOptions());
      this.redis.on('error', (error) => {
        this.logger.warn(`Redis error in clientes cache: ${error.message}`);
      });
    } catch (error) {
      this.logger.warn(
        `No se pudo inicializar Redis para cache de KPIs de clientes: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      this.redis = null;
    }
  }

  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit().catch(() => undefined);
      this.redis = null;
    }
  }

  private hasGeoScope(accessFilter: PrismaAccessFilter): boolean {
    return (
      (accessFilter.zonaIds || []).length > 0 ||
      (accessFilter.municipalityIds || []).length > 0 ||
      (accessFilter.departmentIds || []).length > 0
    );
  }

  private buildDireccionGeoWhere(
    accessFilter: PrismaAccessFilter,
  ): Prisma.DireccionWhereInput | undefined {
    const where: Prisma.DireccionWhereInput = {};

    if ((accessFilter.zonaIds || []).length > 0) {
      where.zonaId = {
        in: accessFilter.zonaIds,
      };
    }

    if ((accessFilter.municipalityIds || []).length > 0) {
      where.municipioId = {
        in: accessFilter.municipalityIds,
      };
    }

    if ((accessFilter.departmentIds || []).length > 0) {
      where.departmentId = {
        in: accessFilter.departmentIds,
      };
    }

    return Object.keys(where).length > 0 ? where : undefined;
  }

  private buildClienteDireccionesInclude(accessFilter: PrismaAccessFilter) {
    const direccionWhere = this.buildDireccionGeoWhere(accessFilter);

    return direccionWhere
      ? {
          where: direccionWhere,
          include: { municipioRel: true },
        }
      : {
          include: { municipioRel: true },
        };
  }

  private buildEmpresaWhere(
    empresaFilter?: PrismaAccessFilter['empresaId'],
  ): PrismaAccessFilter['empresaId'] {
    return empresaFilter;
  }

  private buildClienteWhere(
    accessFilter: PrismaAccessFilter,
    extraWhere: Prisma.ClienteWhereInput = {},
  ): Prisma.ClienteWhereInput {
    const where: Prisma.ClienteWhereInput = {
      ...extraWhere,
      ...(accessFilter.tenantId ? { tenantId: accessFilter.tenantId } : {}),
      ...(accessFilter.empresaId ? { empresaId: accessFilter.empresaId } : {}),
    };

    if ((accessFilter.zonaIds || []).length > 0) {
      where.direcciones = {
        some: this.buildDireccionGeoWhere(accessFilter),
      };
    } else if ((accessFilter.municipalityIds || []).length > 0) {
      where.direcciones = {
        some: this.buildDireccionGeoWhere(accessFilter),
      };
    } else if ((accessFilter.departmentIds || []).length > 0) {
      where.direcciones = {
        some: this.buildDireccionGeoWhere(accessFilter),
      };
    }

    return where;
  }

  private async resolveMunicipalityDepartmentId(
    municipioId: string,
    cache: Map<string, string | null>,
  ): Promise<string | null> {
    if (cache.has(municipioId)) {
      return cache.get(municipioId) ?? null;
    }

    const municipality = await this.prisma.municipality.findUnique({
      where: { id: municipioId },
      select: { departmentId: true },
    });

    const departmentId = municipality?.departmentId ?? null;
    cache.set(municipioId, departmentId);
    return departmentId;
  }

  private async assertClienteDireccionesWithinGeoScope(
    accessFilter: PrismaAccessFilter,
    direcciones?: CreateClienteDto['direcciones'],
  ): Promise<void> {
    if (!this.hasGeoScope(accessFilter)) {
      return;
    }

    if (!direcciones || direcciones.length === 0) {
      throw new UnauthorizedException(
        'No tienes permisos para guardar clientes sin una dirección dentro de tu alcance geográfico.',
      );
    }

    const municipalityDepartmentCache = new Map<string, string | null>();
    const zonaIds = accessFilter.zonaIds ?? [];
    const municipalityIds = accessFilter.municipalityIds ?? [];
    const departmentIds = accessFilter.departmentIds ?? [];

    for (const direccion of direcciones) {
      const rawDireccion = direccion as {
        zonaId?: unknown;
        municipioId?: unknown;
        departmentId?: unknown;
      };
      const zonaId =
        typeof rawDireccion.zonaId === 'string'
          ? rawDireccion.zonaId
          : undefined;
      const municipioId =
        typeof rawDireccion.municipioId === 'string'
          ? rawDireccion.municipioId
          : undefined;
      const departmentId =
        typeof rawDireccion.departmentId === 'string'
          ? rawDireccion.departmentId
          : undefined;

      if (zonaIds.length > 0) {
        if (!zonaId || !zonaIds.includes(zonaId)) {
          throw new UnauthorizedException(
            'La dirección del cliente no está dentro de tu alcance geográfico.',
          );
        }
      }

      if (municipalityIds.length > 0) {
        if (!municipioId || !municipalityIds.includes(municipioId)) {
          throw new UnauthorizedException(
            'La dirección del cliente no está dentro de tu alcance geográfico.',
          );
        }
      }

      if (departmentIds.length > 0) {
        const resolvedDepartmentId =
          departmentId ||
          (municipioId
            ? await this.resolveMunicipalityDepartmentId(
                municipioId,
                municipalityDepartmentCache,
              )
            : null);

        if (
          !resolvedDepartmentId ||
          !departmentIds.includes(resolvedDepartmentId)
        ) {
          throw new UnauthorizedException(
            'La dirección del cliente no está dentro de tu alcance geográfico.',
          );
        }
      }
    }
  }

  private normalizeDashboardQuery(
    query?: QueryClientesDashboardDto,
  ): NormalizedDashboardQuery {
    const toFlag = (value?: string) => value === 'true';

    return {
      page: Math.max(1, Number(query?.page ?? 1) || 1),
      limit: Math.min(100, Math.max(1, Number(query?.limit ?? 10) || 10)),
      search: (query?.search || '').trim(),
      segment: (query?.segment || 'all') as NormalizedDashboardQuery['segment'],
      sort: (query?.sort || '').trim(),
      dir: query?.dir === 'asc' ? 'asc' : 'desc',
      empresas: (query?.empresas || '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
      dept: query?.dept || 'all',
      muni: query?.muni || 'all',
      barrio: (query?.barrio || '').trim(),
      class: query?.class || 'all',
      seg: query?.seg || 'all',
      risk: query?.risk || 'all',
      from: query?.from || '',
      to: query?.to || '',
      onlySinVisita: toFlag(query?.sinVisita),
      onlyWithPendingPayments: toFlag(query?.pendingPayments),
      onlySinServicios: toFlag(query?.sinServicios),
    };
  }

  private buildDashboardWhere(
    accessFilter: PrismaAccessFilter,
    query: NormalizedDashboardQuery,
    extraWhere: Prisma.ClienteWhereInput = {},
  ): Prisma.ClienteWhereInput {
    const andConditions: Prisma.ClienteWhereInput[] = [{ deletedAt: null }];

    if (query.search) {
      const searchTokens = query.search
        .split(/\s+/)
        .map((token) => token.trim())
        .filter(Boolean);

      const searchClauses: Prisma.ClienteWhereInput[] = [
        { nombre: { contains: query.search, mode: 'insensitive' } },
        { apellido: { contains: query.search, mode: 'insensitive' } },
        { razonSocial: { contains: query.search, mode: 'insensitive' } },
        { nit: { contains: query.search, mode: 'insensitive' } },
        { numeroDocumento: { contains: query.search, mode: 'insensitive' } },
        { correo: { contains: query.search, mode: 'insensitive' } },
        { telefono: { contains: query.search, mode: 'insensitive' } },
      ];

      if (searchTokens.length > 1) {
        searchClauses.push({
          AND: searchTokens.map((token) => ({
            OR: [
              { nombre: { contains: token, mode: 'insensitive' } },
              { apellido: { contains: token, mode: 'insensitive' } },
              { razonSocial: { contains: token, mode: 'insensitive' } },
              { nit: { contains: token, mode: 'insensitive' } },
              { numeroDocumento: { contains: token, mode: 'insensitive' } },
              { telefono: { contains: token, mode: 'insensitive' } },
            ],
          })),
        });
      }

      andConditions.push({
        OR: searchClauses,
      });
    }

    if (query.empresas.length > 0) {
      andConditions.push({
        empresaId: {
          in: query.empresas,
        },
      });
    }

    if (query.dept !== 'all') {
      andConditions.push({
        direcciones: {
          some: {
            departmentId: query.dept,
          },
        },
      });
    }

    if (query.muni !== 'all') {
      andConditions.push({
        direcciones: {
          some: {
            municipioId: query.muni,
          },
        },
      });
    }

    if (query.barrio) {
      andConditions.push({
        direcciones: {
          some: {
            barrio: {
              contains: query.barrio,
              mode: 'insensitive',
            },
          },
        },
      });
    }

    if (query.class !== 'all') {
      andConditions.push({
        clasificacion: query.class as ClasificacionCliente,
      });
    }

    if (query.seg !== 'all') {
      andConditions.push({
        segmento: query.seg as SegmentoCliente,
      });
    }

    if (query.risk !== 'all') {
      andConditions.push({
        nivelRiesgo: query.risk as NivelRiesgo,
      });
    }

    if (query.from || query.to) {
      andConditions.push({
        createdAt: {
          ...(query.from
            ? { gte: new Date(`${query.from}T00:00:00.000Z`) }
            : {}),
          ...(query.to ? { lte: new Date(`${query.to}T23:59:59.999Z`) } : {}),
        },
      });
    }

    if (query.onlySinVisita) {
      andConditions.push({
        OR: [{ proximaVisita: null }, { proximaVisita: { lt: new Date() } }],
      });
    }

    return this.buildClienteWhere(accessFilter, {
      AND: andConditions,
      ...extraWhere,
    });
  }

  private buildClienteInclude(
    accessFilter: PrismaAccessFilter,
  ): Prisma.ClienteInclude {
    const empresaWhere = this.buildEmpresaWhere(accessFilter.empresaId);
    const clienteDireccionesInclude =
      this.buildClienteDireccionesInclude(accessFilter);
    const direccionGeoWhere = this.buildDireccionGeoWhere(accessFilter);

    return {
      direcciones: clienteDireccionesInclude,
      vehiculos: true,
      tipoInteres: true,
      empresa: true,
      configuracionesOperativas: {
        where: {
          ...(empresaWhere ? { empresaId: empresaWhere } : {}),
        },
      },
      ordenesServicio: {
        where: {
          ...(empresaWhere ? { empresaId: empresaWhere } : {}),
          ...(direccionGeoWhere
            ? {
                direccion: {
                  is: direccionGeoWhere,
                },
              }
            : {}),
          estadoPago: { not: 'PAGADO' },
        },
        select: {
          id: true,
          estadoPago: true,
          valorCotizado: true,
          valorPagado: true,
          valorRepuestos: true,
        },
      },
    };
  }

  private applyCommercialRisk(
    client: ClienteWithRelations,
  ): ClienteWithRelations {
    if (client.clasificacion === ClasificacionCliente.RIESGO) {
      return client;
    }

    const now = startOfBogotaDayUtc(new Date());
    const lastVisit = client.ultimaVisita
      ? new Date(client.ultimaVisita)
      : null;

    if (!lastVisit) {
      return client;
    }

    const diffDays = (now.getTime() - lastVisit.getTime()) / (1000 * 3600 * 24);
    const frequency = client.frecuenciaServicio || 30;
    const isCommercialRisk =
      diffDays > (frequency === 30 ? 45 : frequency * 1.5);

    if (!isCommercialRisk) {
      return client;
    }

    return {
      ...client,
      clasificacion: ClasificacionCliente.RIESGO,
    };
  }

  private buildDashboardOrderBy(
    query: NormalizedDashboardQuery,
  ): Prisma.ClienteOrderByWithRelationInput {
    switch (query.sort) {
      case 'score':
        return { score: query.dir };
      case 'proximaVisita':
        return { proximaVisita: query.dir };
      default:
        return { createdAt: 'desc' };
    }
  }

  private requiresInMemoryDashboardProcessing(
    query: NormalizedDashboardQuery,
  ): boolean {
    return (
      query.segment !== 'all' ||
      query.sort === 'nombre' ||
      query.sort === 'riesgo'
    );
  }

  private buildSegmentIdSets(segmented: DashboardSegmentedSummary) {
    return {
      riesgoFuga: new Set(segmented.riesgoFuga.data.map((client) => client.id)),
      upsellPotencial: new Set(
        segmented.upsellPotencial.data.map((client) => client.id),
      ),
      dormidos: new Set(segmented.dormidos.data.map((client) => client.id)),
      operacionEstable: new Set(
        segmented.operacionEstable.data.map((client) => client.id),
      ),
    };
  }

  private attachDashboardSegments(
    clients: ClienteWithRelations[],
    segmentIdSets: ReturnType<ClientesService['buildSegmentIdSets']>,
  ): ClienteWithRelations[] {
    return clients.map((client) => ({
      ...client,
      dashboardSegments: (
        Object.entries(segmentIdSets) as [DashboardSegmentKey, Set<string>][]
      )
        .filter(([, ids]) => ids.has(client.id))
        .map(([segment]) => segment),
    }));
  }

  private filterClientsBySegment(
    clients: ClienteWithRelations[],
    segment: NormalizedDashboardQuery['segment'],
  ): ClienteWithRelations[] {
    if (segment === 'all') {
      return clients;
    }

    return clients.filter((client) =>
      (client.dashboardSegments || []).includes(segment),
    );
  }

  private filterClientsInMemory(
    clients: ClienteWithRelations[],
    query: NormalizedDashboardQuery,
  ): ClienteWithRelations[] {
    const todayYmd = startOfBogotaDayUtc(new Date()).toISOString().slice(0, 10);

    return clients.filter((client) => {
      const matchesPendingPayments =
        !query.onlyWithPendingPayments ||
        Boolean(
          client.ordenesServicio?.some((order) => {
            const total =
              Number(order.valorCotizado || 0) +
              Number(order.valorRepuestos || 0);
            const pagado = Number(order.valorPagado || 0);
            return (
              pagado < total &&
              order.estadoPago !== 'PAGADO' &&
              order.estadoPago !== 'CORTESIA'
            );
          }),
        );

      const matchesSinServicios =
        !query.onlySinServicios ||
        !client.ordenesServicio ||
        client.ordenesServicio.length === 0;

      const matchesSinVisita =
        !query.onlySinVisita ||
        !client.proximaVisita ||
        client.proximaVisita.toISOString().slice(0, 10) < todayYmd;

      return matchesPendingPayments && matchesSinServicios && matchesSinVisita;
    });
  }

  private sortClientsInMemory(
    clients: ClienteWithRelations[],
    query: NormalizedDashboardQuery,
  ): ClienteWithRelations[] {
    if (!query.sort) {
      return [...clients].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      );
    }

    return [...clients].sort((a, b) => {
      let aVal: unknown = (a as unknown as Record<string, unknown>)[query.sort];
      let bVal: unknown = (b as unknown as Record<string, unknown>)[query.sort];

      if (query.sort === 'nombre') {
        aVal =
          a.tipoCliente === 'EMPRESA'
            ? a.razonSocial
            : `${a.nombre || ''} ${a.apellido || ''}`.trim();
        bVal =
          b.tipoCliente === 'EMPRESA'
            ? b.razonSocial
            : `${b.nombre || ''} ${b.apellido || ''}`.trim();
      } else if (query.sort === 'riesgo') {
        aVal = String(a.nivelRiesgo || '');
        bVal = String(b.nivelRiesgo || '');
      } else if (query.sort === 'proximaVisita') {
        aVal = a.proximaVisita ? a.proximaVisita.getTime() : 0;
        bVal = b.proximaVisita ? b.proximaVisita.getTime() : 0;
      }

      const nA = Number(aVal);
      const nB = Number(bVal);
      if (!Number.isNaN(nA) && !Number.isNaN(nB)) {
        return query.dir === 'asc' ? nA - nB : nB - nA;
      }

      const sA =
        typeof aVal === 'string' || typeof aVal === 'number'
          ? String(aVal)
          : '';
      const sB =
        typeof bVal === 'string' || typeof bVal === 'number'
          ? String(bVal)
          : '';
      return query.dir === 'asc' ? sA.localeCompare(sB) : sB.localeCompare(sA);
    });
  }

  private buildDashboardOverview(
    clients: ClienteWithRelations[],
  ): DashboardOverview {
    const total = clients.length;
    const empresas = clients.filter(
      (client) => client.tipoCliente === 'EMPRESA',
    ).length;
    const oro = clients.filter(
      (client) => client.clasificacion === ClasificacionCliente.ORO,
    ).length;
    const riesgoCritico = clients.filter((client) => {
      const risk = String(client.nivelRiesgo || '').toUpperCase();
      return risk === 'CRITICO' || risk === 'CRÍTICO' || risk === 'ALTO';
    }).length;
    const avgScore =
      total > 0
        ? Math.round(
            clients.reduce(
              (acc, client) => acc + Number(client.score || 0),
              0,
            ) / total,
          )
        : 0;

    return { total, empresas, oro, riesgoCritico, avgScore };
  }

  private buildDashboardSegmentacion(
    clients: ClienteWithRelations[],
  ): DashboardKpisResponse['segmentacion'] {
    const segmentacionRaw = this.buildSegmentedFromClients(clients);

    return {
      riesgoFuga: { count: segmentacionRaw.riesgoFuga.count },
      upsellPotencial: { count: segmentacionRaw.upsellPotencial.count },
      dormidos: { count: segmentacionRaw.dormidos.count },
      operacionEstable: { count: segmentacionRaw.operacionEstable.count },
    };
  }

  private buildDashboardKpisCacheKey(accessFilter: PrismaAccessFilter): string {
    const empresaScope =
      typeof accessFilter.empresaId === 'string'
        ? accessFilter.empresaId
        : accessFilter.empresaId && 'in' in accessFilter.empresaId
          ? [...accessFilter.empresaId.in].sort().join(',')
          : 'all';

    const zonaScope = [...(accessFilter.zonaIds || [])].sort().join(',');
    const municipalityScope = [...(accessFilter.municipalityIds || [])]
      .sort()
      .join(',');
    const departmentScope = [...(accessFilter.departmentIds || [])]
      .sort()
      .join(',');

    return [
      'clientes',
      'dashboard-kpis',
      `tenant:${accessFilter.tenantId || 'all'}`,
      `empresa:${empresaScope}`,
      `zonas:${zonaScope || 'none'}`,
      `municipios:${municipalityScope || 'none'}`,
      `departamentos:${departmentScope || 'none'}`,
    ].join('|');
  }

  private async getDashboardKpisFromCache(
    cacheKey: string,
  ): Promise<DashboardKpisResponse | null> {
    if (!this.redis) {
      return null;
    }

    try {
      const cached = await this.redis.get(cacheKey);
      if (!cached) {
        return null;
      }

      return JSON.parse(cached) as DashboardKpisResponse;
    } catch (error) {
      this.logger.warn(
        `No se pudo leer cache de KPIs de clientes (${cacheKey}): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return null;
    }
  }

  private async setDashboardKpisCache(
    cacheKey: string,
    payload: DashboardKpisResponse,
  ): Promise<void> {
    if (!this.redis) {
      return;
    }

    try {
      await this.redis.set(
        cacheKey,
        JSON.stringify(payload),
        'EX',
        this.dashboardKpisCacheTtlSeconds,
      );
    } catch (error) {
      this.logger.warn(
        `No se pudo escribir cache de KPIs de clientes (${cacheKey}): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private async invalidateDashboardKpisCache(tenantId?: string): Promise<void> {
    if (!this.redis || !tenantId) {
      return;
    }

    const pattern = `clientes|dashboard-kpis|tenant:${tenantId}|*`;

    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      this.logger.warn(
        `No se pudo invalidar cache de KPIs de clientes (${pattern}): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private buildPaginationMeta(
    total: number,
    page: number,
    limit: number,
  ): DashboardPaginationMeta {
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const normalizedPage = Math.min(page, totalPages);

    return {
      page: normalizedPage,
      limit,
      total,
      totalPages,
      hasNextPage: normalizedPage < totalPages,
      hasPrevPage: normalizedPage > 1,
    };
  }

  private buildOrderScopeSql(accessFilter: PrismaAccessFilter): Prisma.Sql {
    const clauses: Prisma.Sql[] = [Prisma.sql`os."deletedAt" IS NULL`];

    if (accessFilter.tenantId) {
      clauses.push(Prisma.sql`os."tenantId" = ${accessFilter.tenantId}::uuid`);
    }

    if (typeof accessFilter.empresaId === 'string') {
      clauses.push(
        Prisma.sql`os."empresaId" = ${accessFilter.empresaId}::uuid`,
      );
    } else if (
      accessFilter.empresaId &&
      'in' in accessFilter.empresaId &&
      accessFilter.empresaId.in.length > 0
    ) {
      clauses.push(
        Prisma.sql`os."empresaId" IN (${Prisma.join(
          accessFilter.empresaId.in.map((id) => Prisma.sql`${id}::uuid`),
        )})`,
      );
    }

    if ((accessFilter.zonaIds || []).length > 0) {
      clauses.push(
        Prisma.sql`os."zonaId" IN (${Prisma.join(
          (accessFilter.zonaIds || []).map((id) => Prisma.sql`${id}::uuid`),
        )})`,
      );
    }

    if ((accessFilter.municipalityIds || []).length > 0) {
      clauses.push(
        Prisma.sql`dir."municipioId" IN (${Prisma.join(
          (accessFilter.municipalityIds || []).map(
            (id) => Prisma.sql`${id}::uuid`,
          ),
        )})`,
      );
    }

    if ((accessFilter.departmentIds || []).length > 0) {
      clauses.push(
        Prisma.sql`dir."departmentId" IN (${Prisma.join(
          (accessFilter.departmentIds || []).map(
            (id) => Prisma.sql`${id}::uuid`,
          ),
        )})`,
      );
    }

    return Prisma.join(clauses, ' AND ');
  }

  private async getHybridClienteIds(
    accessFilter: PrismaAccessFilter,
    query: NormalizedDashboardQuery,
  ): Promise<string[] | null> {
    const requestedFilters: Array<'sinServicios' | 'pendingPayments'> = [];

    if (query.onlySinServicios) {
      requestedFilters.push('sinServicios');
    }

    if (query.onlyWithPendingPayments) {
      requestedFilters.push('pendingPayments');
    }

    if (requestedFilters.length === 0) {
      return null;
    }

    const clauses: Prisma.Sql[] = [Prisma.sql`c."deletedAt" IS NULL`];

    if (accessFilter.tenantId) {
      clauses.push(Prisma.sql`c."tenantId" = ${accessFilter.tenantId}::uuid`);
    }

    if (typeof accessFilter.empresaId === 'string') {
      clauses.push(Prisma.sql`c."empresaId" = ${accessFilter.empresaId}::uuid`);
    } else if (
      accessFilter.empresaId &&
      'in' in accessFilter.empresaId &&
      accessFilter.empresaId.in.length > 0
    ) {
      clauses.push(
        Prisma.sql`c."empresaId" IN (${Prisma.join(
          accessFilter.empresaId.in.map((id) => Prisma.sql`${id}::uuid`),
        )})`,
      );
    }

    const orderScopeSql = this.buildOrderScopeSql(accessFilter);

    if (query.onlySinServicios) {
      clauses.push(Prisma.sql`
        NOT EXISTS (
          SELECT 1
          FROM "ordenes_servicio" os
          LEFT JOIN "direcciones" dir ON dir."id" = os."direccionId"
          WHERE os."clienteId" = c."id"
            AND ${orderScopeSql}
        )
      `);
    }

    if (query.onlyWithPendingPayments) {
      clauses.push(Prisma.sql`
        EXISTS (
          SELECT 1
          FROM "ordenes_servicio" os
          LEFT JOIN "direcciones" dir ON dir."id" = os."direccionId"
          WHERE os."clienteId" = c."id"
            AND ${orderScopeSql}
            AND os."estadoPago" NOT IN ('PAGADO', 'CORTESIA')
            AND COALESCE(os."valorPagado", 0) < (
              COALESCE(os."valorCotizado", 0) + COALESCE(os."valorRepuestos", 0)
            )
        )
      `);
    }

    const rows = await this.prisma.$queryRaw<ClienteIdRow[]>(Prisma.sql`
      SELECT c."id"
      FROM "clientes" c
      WHERE ${Prisma.join(clauses, ' AND ')}
    `);

    return rows.map((row) => row.id);
  }

  private buildSegmentedFromClients(clients: ClienteWithRelations[]) {
    // ... rest of private method unchanged ...
    const tickets = clients
      .map((c) => Number(c.ticketPromedio))
      .filter((t) => !isNaN(t) && t > 0)
      .sort((a, b) => a - b);

    let median = 0;
    if (tickets.length > 0) {
      const mid = Math.floor(tickets.length / 2);
      median =
        tickets.length % 2 !== 0
          ? tickets[mid]
          : (tickets[mid - 1] + (tickets[mid] ?? 0)) / 2;
    }

    const now = startOfBogotaDayUtc(new Date());
    const inactivityThresholdDate = new Date();
    inactivityThresholdDate.setDate(now.getDate() - 120);

    const segmented = {
      riesgoFuga: [] as ClienteWithRelations[],
      upsellPotencial: [] as ClienteWithRelations[],
      dormidos: [] as ClienteWithRelations[],
      operacionEstable: [] as ClienteWithRelations[],
    };

    clients.forEach((client) => {
      const riesgoNombre = String(client.nivelRiesgo || '').toUpperCase();
      const isRiesgoFuga =
        riesgoNombre.includes('ALTO') ||
        riesgoNombre.includes('CRITICO') ||
        riesgoNombre.includes('CRÍTICO') ||
        (client.proximaVisita && new Date(client.proximaVisita) < now);

      if (isRiesgoFuga) {
        segmented.riesgoFuga.push(client);
        return;
      }

      const isUpsell =
        (client.clasificacion === ClasificacionCliente.ORO ||
          client.clasificacion === ClasificacionCliente.PLATA) &&
        Number(client.ticketPromedio || 0) > median;

      if (isUpsell) {
        segmented.upsellPotencial.push(client);
        return;
      }

      const lastVisit = client.ultimaVisita
        ? new Date(client.ultimaVisita)
        : new Date(client.createdAt);
      const isDormido = lastVisit < inactivityThresholdDate;

      if (isDormido) {
        segmented.dormidos.push(client);
        return;
      }

      segmented.operacionEstable.push(client);
    });

    return {
      riesgoFuga: {
        count: segmented.riesgoFuga.length,
        data: segmented.riesgoFuga as Cliente[],
      },
      upsellPotencial: {
        count: segmented.upsellPotencial.length,
        data: segmented.upsellPotencial as Cliente[],
      },
      dormidos: {
        count: segmented.dormidos.length,
        data: segmented.dormidos as Cliente[],
      },
      operacionEstable: {
        count: segmented.operacionEstable.length,
        data: segmented.operacionEstable as Cliente[],
      },
    };
  }

  async findAll(user: JwtPayload, reqEmpresaId?: string): Promise<Cliente[]> {
    const accessFilter = getPrismaAccessFilter(user, reqEmpresaId);
    const clients = await this.prisma.cliente.findMany({
      where: this.buildClienteWhere(accessFilter, { deletedAt: null }),
      orderBy: { createdAt: 'desc' },
      include: this.buildClienteInclude(accessFilter),
    });

    return clients.map((client) =>
      this.applyCommercialRisk(client as ClienteWithRelations),
    ) as Cliente[];
  }

  async search(
    user: JwtPayload,
    query?: QueryClientesSearchDto,
    reqEmpresaId?: string,
  ): Promise<ClienteSearchResult[]> {
    const accessFilter = getPrismaAccessFilter(user, reqEmpresaId);
    const q = (query?.q || '').trim();
    const limit = Math.min(25, Math.max(1, Number(query?.limit ?? 10) || 10));

    if (!q) {
      return this.prisma.cliente.findMany({
        where: this.buildClienteWhere(accessFilter, { deletedAt: null }),
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: clienteSearchSelect,
      });
    }

    const searchTokens = q
      .split(/\s+/)
      .map((token) => token.trim())
      .filter(Boolean);

    const searchClauses: Prisma.ClienteWhereInput[] = [
      { telefono: { contains: q, mode: 'insensitive' } },
      { telefono2: { contains: q, mode: 'insensitive' } },
      { numeroDocumento: { contains: q, mode: 'insensitive' } },
      { nombre: { contains: q, mode: 'insensitive' } },
      { apellido: { contains: q, mode: 'insensitive' } },
      { razonSocial: { contains: q, mode: 'insensitive' } },
      { nit: { contains: q, mode: 'insensitive' } },
    ];

    if (searchTokens.length > 1) {
      searchClauses.push({
        AND: searchTokens.map((token) => ({
          OR: [
            { nombre: { contains: token, mode: 'insensitive' } },
            { apellido: { contains: token, mode: 'insensitive' } },
            { razonSocial: { contains: token, mode: 'insensitive' } },
            { nit: { contains: token, mode: 'insensitive' } },
            { numeroDocumento: { contains: token, mode: 'insensitive' } },
            { telefono: { contains: token, mode: 'insensitive' } },
            { telefono2: { contains: token, mode: 'insensitive' } },
          ],
        })),
      });
    }

    return this.prisma.cliente.findMany({
      where: this.buildClienteWhere(accessFilter, {
        deletedAt: null,
        OR: searchClauses,
      }),
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: clienteSearchSelect,
    });
  }

  async getSegmented(user: JwtPayload, reqEmpresaId?: string) {
    const accessFilter = getPrismaAccessFilter(user, reqEmpresaId);
    const empresaWhere = this.buildEmpresaWhere(accessFilter.empresaId);
    const clienteDireccionesInclude =
      this.buildClienteDireccionesInclude(accessFilter);
    const direccionGeoWhere = this.buildDireccionGeoWhere(accessFilter);

    const clients = await this.prisma.cliente.findMany({
      where: this.buildClienteWhere(accessFilter, { deletedAt: null }),
      include: {
        direcciones: clienteDireccionesInclude,
        vehiculos: true,
        tipoInteres: true,
        configuracionesOperativas: {
          where: {
            ...(empresaWhere ? { empresaId: empresaWhere } : {}),
          },
        },
        ordenesServicio: {
          where: {
            ...(empresaWhere ? { empresaId: empresaWhere } : {}),
            ...(direccionGeoWhere
              ? {
                  direccion: {
                    is: direccionGeoWhere,
                  },
                }
              : {}),
            estadoPago: { not: 'PAGADO' },
          },
          select: {
            id: true,
            estadoPago: true,
            valorCotizado: true,
            valorPagado: true,
            valorRepuestos: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return this.buildSegmentedFromClients(clients as ClienteWithRelations[]);
  }

  async getDashboardData(
    user: JwtPayload,
    reqEmpresaId?: string,
    rawQuery?: QueryClientesDashboardDto,
  ) {
    const query = this.normalizeDashboardQuery(rawQuery);
    const accessFilter = getPrismaAccessFilter(user, reqEmpresaId);
    const include = this.buildClienteInclude(accessFilter);
    const hybridIds = await this.getHybridClienteIds(accessFilter, query);
    const extraWhere: Prisma.ClienteWhereInput =
      hybridIds === null
        ? {}
        : hybridIds.length > 0
          ? { id: { in: hybridIds } }
          : { id: { in: ['00000000-0000-0000-0000-000000000000'] } };

    const where = this.buildDashboardWhere(accessFilter, query, extraWhere);

    if (this.requiresInMemoryDashboardProcessing(query)) {
      const summaryClients = (await this.prisma.cliente.findMany({
        where: this.buildClienteWhere(accessFilter, { deletedAt: null }),
        select: {
          id: true,
          tipoCliente: true,
          clasificacion: true,
          nivelRiesgo: true,
          score: true,
          ticketPromedio: true,
          frecuenciaServicio: true,
          proximaVisita: true,
          ultimaVisita: true,
          createdAt: true,
        },
      })) as ClienteWithRelations[];
      const segmentIdSets = this.buildSegmentIdSets(
        this.buildSegmentedFromClients(summaryClients),
      );

      const rawClients = (await this.prisma.cliente.findMany({
        where,
        include,
        orderBy: { createdAt: 'desc' },
      })) as ClienteWithRelations[];

      const clients = this.attachDashboardSegments(
        rawClients.map((client) => this.applyCommercialRisk(client)),
        segmentIdSets,
      );
      const segmentFiltered = this.filterClientsBySegment(
        clients,
        query.segment,
      );
      const finalFiltered = this.sortClientsInMemory(
        this.filterClientsInMemory(segmentFiltered, query),
        query,
      );

      const pagination = this.buildPaginationMeta(
        finalFiltered.length,
        query.page,
        query.limit,
      );
      const start = (pagination.page - 1) * pagination.limit;
      const end = start + pagination.limit;

      return {
        clientes: finalFiltered.slice(start, end),
        segmentacion: null,
        overview: null,
        pagination,
      };
    }

    const total = await this.prisma.cliente.count({ where });
    const pagination = this.buildPaginationMeta(total, query.page, query.limit);
    const rawClients = (await this.prisma.cliente.findMany({
      where,
      include,
      orderBy: this.buildDashboardOrderBy(query),
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
    })) as ClienteWithRelations[];

    const clientes = rawClients.map((client) =>
      this.applyCommercialRisk(client),
    );

    return {
      clientes,
      segmentacion: null,
      overview: null,
      pagination,
    };
  }

  async getDashboardKpis(
    user: JwtPayload,
    reqEmpresaId?: string,
    options?: { refresh?: boolean },
  ): Promise<DashboardKpisResponse> {
    const accessFilter = getPrismaAccessFilter(user, reqEmpresaId);
    const cacheKey = this.buildDashboardKpisCacheKey(accessFilter);
    const shouldRefresh = options?.refresh === true;

    if (!shouldRefresh) {
      const cached = await this.getDashboardKpisFromCache(cacheKey);
      if (cached) {
        return {
          ...cached,
          meta: {
            ...cached.meta,
            cached: true,
          },
        };
      }
    }

    const summaryClients = (await this.prisma.cliente.findMany({
      where: this.buildClienteWhere(accessFilter, { deletedAt: null }),
      select: {
        id: true,
        tipoCliente: true,
        clasificacion: true,
        nivelRiesgo: true,
        score: true,
        ticketPromedio: true,
        frecuenciaServicio: true,
        proximaVisita: true,
        ultimaVisita: true,
        createdAt: true,
      },
    })) as ClienteWithRelations[];

    const payload: DashboardKpisResponse = {
      overview: this.buildDashboardOverview(summaryClients),
      segmentacion: this.buildDashboardSegmentacion(summaryClients),
      meta: {
        cached: false,
        generatedAt: new Date().toISOString(),
        cacheTtlSeconds: this.dashboardKpisCacheTtlSeconds,
      },
    };

    await this.setDashboardKpisCache(cacheKey, payload);

    return payload;
  }

  async create(
    user: JwtPayload,
    dto: CreateClienteDto,
    reqEmpresaId?: string,
  ): Promise<Cliente> {
    const {
      direcciones,
      vehiculos,
      metrajeTotal,
      tipoInteresId,
      empresaId: _empresaId,
      ...restDto
    } = dto as CreateClienteDto & { empresaId?: string };

    void _empresaId;

    const accessFilter = getPrismaAccessFilter(user, reqEmpresaId);
    await this.assertClienteDireccionesWithinGeoScope(
      accessFilter,
      direcciones,
    );

    // Resolve the actual empresaId for creation.
    // If multiple are allowed, we use the first one or the requested one.
    let empresaId: string | undefined;
    const accessEmpresaId = accessFilter.empresaId;
    if (typeof accessEmpresaId === 'string') {
      empresaId = accessEmpresaId;
    } else if (accessEmpresaId && 'in' in accessEmpresaId) {
      empresaId = accessEmpresaId.in[0];
    }

    const toDecimal = (val: unknown, decimals: number = 2) => {
      if (val === null || val === undefined || val === '') return null;
      const num = Number(val);
      return isNaN(num) ? null : num.toFixed(decimals);
    };

    const orConditions: Prisma.ClienteWhereInput[] = [];
    if (
      restDto.numeroDocumento &&
      restDto.numeroDocumento !== 'No Concretado'
    ) {
      orConditions.push({ numeroDocumento: restDto.numeroDocumento });
    }
    if (restDto.nit && restDto.nit !== 'No Concretado') {
      orConditions.push({ nit: restDto.nit });
    }
    if (restDto.telefono && restDto.telefono !== 'No Concretado') {
      orConditions.push({ telefono: restDto.telefono });
    }

    if (orConditions.length > 0) {
      const existingClient = await this.prisma.cliente.findFirst({
        where: {
          tenantId: user.tenantId,
          OR: orConditions,
          deletedAt: null,
        },
      });

      if (existingClient) {
        throw new ConflictException(
          'Ya existe un cliente con este número de documento, NIT o teléfono en el sistema.',
        );
      }
    }

    const data = {
      ...restDto,
      tenant: { connect: { id: user.tenantId } },
      ...(empresaId && { empresa: { connect: { id: empresaId } } }),
      segmento: restDto.segmento || SegmentoCliente.OTRO,
      nivelRiesgo: restDto.nivelRiesgo || NivelRiesgo.MEDIO,
      metrajeTotal: toDecimal(metrajeTotal, 2)
        ? new Prisma.Decimal(toDecimal(metrajeTotal, 2)!)
        : null,
      creadoPor: user.membershipId
        ? { connect: { id: user.membershipId } }
        : undefined,
      ...(tipoInteresId && {
        tipoInteres: { connect: { id: tipoInteresId } },
      }),

      direcciones: {
        create: direcciones?.map((d) => ({
          ...d,
          tenantId: user.tenantId,
          ...(empresaId && { empresaId }),
          latitud: d.latitud ? Number(d.latitud) : null,
          longitud: d.longitud ? Number(d.longitud) : null,
          precisionGPS: toDecimal(d.precisionGPS, 2),
        })),
      },

      vehiculos: {
        create: vehiculos?.map((v) => ({
          ...v,
          tenantId: user.tenantId,
          ...(empresaId && { empresaId }),
        })),
      },
    } as unknown as Prisma.ClienteCreateInput;

    try {
      const createdCliente = (await this.prisma.cliente.create({
        data,
        include: {
          direcciones: true,
          vehiculos: true,
          tipoInteres: true,
        },
      })) as Cliente;

      await this.invalidateDashboardKpisCache(user.tenantId);

      return createdCliente;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Ya existe un cliente con este número de documento, NIT o teléfono en el sistema.',
        );
      }

      console.error(
        'Error creating cliente. Data:',
        JSON.stringify(data, null, 2),
      );
      console.error('Prisma Error:', error);
      throw error;
    }
  }

  async findOne(id: string, user: JwtPayload): Promise<Cliente | null> {
    const accessFilter = getPrismaAccessFilter(user);
    const clienteDireccionesInclude =
      this.buildClienteDireccionesInclude(accessFilter);

    return this.prisma.cliente.findFirst({
      where: this.buildClienteWhere(accessFilter, { id, deletedAt: null }),
      include: {
        direcciones: clienteDireccionesInclude,
        vehiculos: true,
        tipoInteres: true,
        empresa: true,
        contratosCliente: {
          where: {
            ...(accessFilter.tenantId
              ? { tenantId: accessFilter.tenantId }
              : {}),
            ...(accessFilter.empresaId
              ? { empresaId: accessFilter.empresaId }
              : {}),
            estado: EstadoContratoCliente.ACTIVO,
          },
          orderBy: { fechaInicio: 'desc' },
        },
      },
    });
  }

  async update(
    id: string,
    user: JwtPayload,
    dto: Partial<CreateClienteDto>,
  ): Promise<Cliente> {
    const accessFilter = getPrismaAccessFilter(user);

    // Verify access first
    const existing = await this.prisma.cliente.findFirst({
      where: this.buildClienteWhere(accessFilter, { id }),
    });
    if (!existing) {
      throw new UnauthorizedException(
        'No tienes permisos para editar este cliente',
      );
    }

    const { direcciones, vehiculos, metrajeTotal, ...restDto } = dto;
    await this.assertClienteDireccionesWithinGeoScope(
      accessFilter,
      direcciones,
    );

    const toDecimal = (val: unknown, decimals: number = 2) => {
      if (val === null || val === undefined || val === '') return null;
      const num = Number(val);
      return isNaN(num) ? null : num.toFixed(decimals);
    };

    if (direcciones) {
      await this.prisma.direccion.deleteMany({ where: { clienteId: id } });
    }
    if (vehiculos) {
      await this.prisma.vehiculo.deleteMany({ where: { clienteId: id } });
    }

    const data = {
      ...restDto,
      metrajeTotal: toDecimal(metrajeTotal, 2)
        ? new Prisma.Decimal(toDecimal(metrajeTotal, 2)!)
        : undefined,

      direcciones: direcciones
        ? {
            create: direcciones.map((d) => ({
              ...d,
              tenantId: user.tenantId,
              latitud: d.latitud ? Number(d.latitud) : null,
              longitud: d.longitud ? Number(d.longitud) : null,
              precisionGPS: toDecimal(d.precisionGPS, 2),
            })),
          }
        : undefined,

      vehiculos: vehiculos
        ? {
            create: vehiculos.map((v) => ({
              ...v,
              tenantId: user.tenantId,
            })),
          }
        : undefined,
    } as unknown as Prisma.ClienteUpdateInput;

    const updatedCliente = (await this.prisma.cliente.update({
      where: { id },
      data,
      include: {
        direcciones: true,
        vehiculos: true,
        tipoInteres: true,
      },
    })) as Cliente;

    await this.invalidateDashboardKpisCache(user.tenantId);

    return updatedCliente;
  }

  async remove(id: string, user: JwtPayload): Promise<Cliente> {
    const accessFilter = getPrismaAccessFilter(user);

    // Verify access
    const existing = await this.prisma.cliente.findFirst({
      where: this.buildClienteWhere(accessFilter, { id }),
    });
    if (!existing) {
      throw new UnauthorizedException(
        'No tienes permisos para eliminar este cliente',
      );
    }

    const deletedCliente = await this.prisma.cliente.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.invalidateDashboardKpisCache(user.tenantId);

    return deletedCliente;
  }

  private getRedisOptions(): RedisOptions {
    const redisUrl = this.configService.get<string>('REDIS_URL');

    if (redisUrl) {
      const parsed = new URL(redisUrl);
      const dbFromPath = parsed.pathname?.replace('/', '').trim();

      return {
        host: parsed.hostname,
        port: Number(parsed.port || 6379),
        username: parsed.username || undefined,
        password: parsed.password || undefined,
        db: dbFromPath ? Number(dbFromPath) : 0,
        tls: parsed.protocol === 'rediss:' ? {} : undefined,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
      };
    }

    const host = this.configService.get<string>('REDIS_HOST') || '127.0.0.1';
    const port = Number(this.configService.get<string>('REDIS_PORT') || 6379);
    const username =
      this.configService.get<string>('REDIS_USERNAME') ||
      this.configService.get<string>('REDIS_USER') ||
      undefined;
    const password = this.configService.get<string>('REDIS_PASSWORD');
    const db = Number(
      this.configService.get<string>('REDIS_DB') ||
        this.configService.get<string>('REDIS_BD') ||
        0,
    );

    return {
      host,
      port,
      username,
      password,
      db,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    };
  }
}
