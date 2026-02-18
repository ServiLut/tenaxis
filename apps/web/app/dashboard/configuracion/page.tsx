"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  getSegmentosAction,
  getRiesgosAction,
  getTiposInteresAction,
  createSegmentoAction,
  updateSegmentoAction,
  createRiesgoAction,
  updateRiesgoAction,
  createTipoInteresAction,
  updateTipoInteresAction,
} from "../actions";
import { DashboardLayout } from "@/components/dashboard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { 
  Settings, 
  Target, 
  ShieldAlert, 
  Zap, 
  Plus, 
  Pencil, 
  Trash2, 
  Save, 
  X,
  Palette,
  Hash,
  Clock,
  AlertTriangle,
  Info,
  Lightbulb,
  CheckCircle2,
  ListChecks
} from "lucide-react";
import { cn } from "@/components/ui/utils";

type Segmento = {
  id: string;
  nombre: string;
  descripcion: string | null;
  frecuenciaSugerida: number;
  riesgoSugerido: string;
  activo: boolean;
};

type Riesgo = {
  id: string;
  nombre: string;
  color: string | null;
  valor: number;
  activo: boolean;
};

type TipoInteres = {
  id: string;
  nombre: string;
  descripcion: string | null;
  frecuenciaSugerida?: number;
  riesgoSugerido?: string;
  activo: boolean;
};

export default function ConfiguracionPage() {
  const [activeTab, setActiveTab] = useState<"segmentos" | "riesgos" | "intereses">("segmentos");
  const [loading, setLoading] = useState(true);
  
  const [segmentos, setSegmentos] = useState<Segmento[]>([]);
  const [riesgos, setRiesgos] = useState<Riesgo[]>([]);
  const [intereses, setIntereses] = useState<TipoInteres[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Segmento | Riesgo | TipoInteres | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [segs, ries, ints] = await Promise.all([
        getSegmentosAction(),
        getRiesgosAction(),
        getTiposInteresAction()
      ]);
      setSegmentos(segs);
      setRiesgos(ries);
      setIntereses(ints);
    } catch (error) {
      console.error("Error loading config:", error);
      toast.error("Error al cargar la configuración");
    } finally {
      setLoading(false);
    }
  }

  const handleOpenModal = (item: Segmento | Riesgo | TipoInteres | null = null) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingItem(null);
    setIsModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const entries = Object.fromEntries(formData.entries());
    
    // Logic to convert and cast data based on active tab
    try {
      if (activeTab === "segmentos") {
        const data = {
          nombre: entries.nombre as string,
          descripcion: entries.descripcion as string || null,
          frecuenciaSugerida: parseInt(entries.frecuenciaSugerida as string) || 30,
          riesgoSugerido: entries.riesgoSugerido as string || "BAJO",
        };

        if (editingItem && 'frecuenciaSugerida' in editingItem) {
          await updateSegmentoAction(editingItem.id, data);
          toast.success("Segmento actualizado");
        } else {
          await createSegmentoAction(data);
          toast.success("Segmento creado");
        }
      } else if (activeTab === "riesgos") {
        const data = {
          nombre: entries.nombre as string,
          color: entries.color as string || null,
          valor: parseInt(entries.valor as string) || 0,
        };

        if (editingItem && 'valor' in editingItem) {
          await updateRiesgoAction(editingItem.id, data);
          toast.success("Nivel de riesgo actualizado");
        } else {
          await createRiesgoAction(data);
          toast.success("Nivel de riesgo creado");
        }
      } else if (activeTab === "intereses") {
        const data = {
          nombre: entries.nombre as string,
          descripcion: entries.descripcion as string || null,
          frecuenciaSugerida: parseInt(entries.frecuenciaSugerida as string) || 30,
          riesgoSugerido: entries.riesgoSugerido as string || "BAJO",
        };

        if (editingItem && 'id' in editingItem && !('valor' in editingItem) && !('frecuenciaSugerida' in editingItem)) {
          // This is a bit tricky since TipoInteres might not have frequency in its type definition but it does in DTO
          // Let's adjust TipoInteres type at the top
          await updateTipoInteresAction(editingItem.id, data);
          toast.success("Tipo de interés actualizado");
        } else if (editingItem && 'id' in editingItem && !('valor' in editingItem)) {
           // Fallback for interests if they have same structure as segments
           await updateTipoInteresAction(editingItem.id, data);
           toast.success("Tipo de interés actualizado");
        } else {
          await createTipoInteresAction(data);
          toast.success("Tipo de interés creado");
        }
      }
      loadData();
      handleCloseModal();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error al guardar";
      toast.error(message);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-azul-1/10 text-azul-1">
              <Settings className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white">Configuración del Negocio</h1>
              <p className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Personaliza los parámetros operativos de tu empresa</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-2xl w-fit">
          <button 
            onClick={() => setActiveTab("segmentos")}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all",
              activeTab === "segmentos" ? "bg-white dark:bg-zinc-800 text-azul-1 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
            )}
          >
            <Target className="h-4 w-4" /> Segmentos
          </button>
          <button 
            onClick={() => setActiveTab("riesgos")}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all",
              activeTab === "riesgos" ? "bg-white dark:bg-zinc-800 text-azul-1 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
            )}
          >
            <ShieldAlert className="h-4 w-4" /> Riesgos Operativos
          </button>
          <button 
            onClick={() => setActiveTab("intereses")}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all",
              activeTab === "intereses" ? "bg-white dark:bg-zinc-800 text-azul-1 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
            )}
          >
            <Zap className="h-4 w-4" /> Tipos de Interés
          </button>
        </div>

        {/* Main Content */}
        <Card className="border-none shadow-xl shadow-zinc-200/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-8">
            <div>
              <CardTitle className="text-xl font-black">
                {activeTab === "segmentos" ? "Segmentos de Negocio" : activeTab === "riesgos" ? "Niveles de Riesgo" : "Tipos de Interés de Servicio"}
              </CardTitle>
              <CardDescription className="font-bold text-[10px] uppercase tracking-widest mt-1">
                {activeTab === "segmentos" ? "Define cómo clasificas a tus clientes por industria" : activeTab === "riesgos" ? "Gestiona los niveles de riesgo para priorizar servicios" : "Administra las opciones de servicio que interesan a tus clientes"}
              </CardDescription>
            </div>
            <Button onClick={() => handleOpenModal()} className="bg-azul-1 hover:bg-azul-1/90 text-white font-bold rounded-xl gap-2 h-11 px-6">
              <Plus className="h-4 w-4" /> AGREGAR NUEVO
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex h-40 items-center justify-center text-zinc-400 font-bold uppercase tracking-widest animate-pulse">Cargando parámetros...</div>
            ) : (
              <div className="grid gap-4">
                {activeTab === "segmentos" && segmentos.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-6 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 hover:border-azul-1/20 transition-colors">
                    <div className="flex gap-4 items-center">
                      <div className="h-12 w-12 rounded-xl bg-white dark:bg-zinc-800 flex items-center justify-center border border-zinc-200 dark:border-zinc-700 shadow-sm">
                        <Target className="h-6 w-6 text-azul-1" />
                      </div>
                      <div>
                        <h4 className="font-black text-zinc-900 dark:text-white">{item.nombre}</h4>
                        <p className="text-xs text-zinc-500 font-medium">{item.descripcion || "Sin descripción"}</p>
                        <div className="flex gap-3 mt-2">
                          <span className="text-[10px] font-black uppercase tracking-tighter bg-azul-1/10 text-azul-1 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Freq: {item.frecuenciaSugerida} días
                          </span>
                          <span className="text-[10px] font-black uppercase tracking-tighter bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" /> Riesgo: {item.riesgoSugerido}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleOpenModal(item)} className="h-10 w-10 rounded-full hover:bg-white hover:text-azul-1 shadow-sm border border-transparent hover:border-zinc-200">
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                {activeTab === "riesgos" && riesgos.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-6 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 hover:border-azul-1/20 transition-colors">
                    <div className="flex gap-4 items-center">
                      <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center border shadow-sm", 
                        item.color === 'emerald' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' :
                        item.color === 'amber' ? 'bg-amber-50 border-amber-200 text-amber-600' :
                        item.color === 'orange' ? 'bg-orange-50 border-orange-200 text-orange-600' :
                        'bg-red-50 border-red-200 text-red-600'
                      )}>
                        <ShieldAlert className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="font-black text-zinc-900 dark:text-white">{item.nombre}</h4>
                        <p className="text-xs text-zinc-500 font-black uppercase tracking-widest flex items-center gap-2">
                          <Hash className="h-3 w-3" /> Valor de Scoring: {item.valor}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleOpenModal(item)} className="h-10 w-10 rounded-full hover:bg-white hover:text-azul-1 shadow-sm border border-transparent hover:border-zinc-200">
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                {activeTab === "intereses" && intereses.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-6 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 hover:border-azul-1/20 transition-colors">
                    <div className="flex gap-4 items-center">
                      <div className="h-12 w-12 rounded-xl bg-white dark:bg-zinc-800 flex items-center justify-center border border-zinc-200 dark:border-zinc-700 shadow-sm">
                        <Zap className="h-6 w-6 text-azul-1" />
                      </div>
                      <div>
                        <h4 className="font-black text-zinc-900 dark:text-white">{item.nombre}</h4>
                        <p className="text-xs text-zinc-500 font-medium">{item.descripcion || "Sin descripción"}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleOpenModal(item)} className="h-10 w-10 rounded-full hover:bg-white hover:text-azul-1 shadow-sm border border-transparent hover:border-zinc-200">
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                {!loading && ((activeTab === "segmentos" && segmentos.length === 0) || (activeTab === "riesgos" && riesgos.length === 0) || (activeTab === "intereses" && intereses.length === 0)) && (
                  <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
                    <Settings className="h-12 w-12 mb-4 opacity-20" />
                    <p className="font-bold uppercase tracking-widest text-xs">No hay elementos configurados</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-lg animate-in fade-in zoom-in duration-200 border-none shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-2xl font-black">
                  {editingItem ? 'Editar' : 'Agregar'} {activeTab === "segmentos" ? 'Segmento' : activeTab === "riesgos" ? 'Nivel de Riesgo' : 'Tipo de Interés'}
                </CardTitle>
                <CardDescription className="font-bold text-[10px] uppercase tracking-widest mt-1">Completa los campos para guardar los cambios</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={handleCloseModal} className="h-10 w-10 rounded-full">
                <X className="h-5 w-5" />
              </Button>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-6">
                {/* Sección Informativa Dinámica */}
                <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl p-5 border border-zinc-100 dark:border-zinc-800 space-y-3">
                  <div className="flex items-center gap-2 text-azul-1">
                    <Info className="h-4 w-4" />
                    <span className="text-[10px] font-black uppercase tracking-[0.15em]">¿Qué significa este parámetro?</span>
                  </div>
                  
                  {activeTab === "riesgos" && (
                    <div className="space-y-3">
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed">
                        El Nivel de Riesgo clasifica el impacto sanitario y operativo del cliente según su actividad. Determina la frecuencia recomendada, supervisión técnica y prioridad en el SLA.
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Frecuencia dinámica
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Prioridad de atención
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "segmentos" && (
                    <div className="space-y-3">
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed">
                        El Segmento define el tipo de actividad del cliente. Permite que el sistema sugiera protocolos técnicos, frecuencias ideales y niveles de riesgo predeterminados.
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500">
                          <ListChecks className="h-3 w-3 text-azul-1" /> Protocolos auto
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500">
                          <ListChecks className="h-3 w-3 text-azul-1" /> Checklist específico
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "intereses" && (
                    <div className="space-y-3">
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed">
                        Indica qué solución solicita el cliente. Permite priorizar la atención, activar plantillas comerciales y generar propuestas acordes a la necesidad detectada.
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500">
                          <Zap className="h-3 w-3 text-amber-500" /> Lead Scoring
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500">
                          <Zap className="h-3 w-3 text-amber-500" /> Estrategia comercial
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Nombre del parámetro</Label>
                  <Input name="nombre" defaultValue={editingItem?.nombre} required placeholder="Ej: Restaurante, Crítico, Fumigación" className="h-12 rounded-xl" />
                </div>

                {activeTab === "segmentos" && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Descripción corta</Label>
                      <Input name="descripcion" defaultValue={editingItem?.descripcion} placeholder="Breve detalle del segmento" className="h-12 rounded-xl" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Frecuencia Ideal (Días)</Label>
                        <Input type="number" name="frecuenciaSugerida" defaultValue={editingItem?.frecuenciaSugerida || 30} className="h-12 rounded-xl" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Riesgo por Defecto</Label>
                        <Select name="riesgoSugerido" defaultValue={editingItem?.riesgoSugerido || 'BAJO'} className="h-12 rounded-xl">
                          <option value="BAJO">BAJO</option>
                          <option value="MEDIO">MEDIO</option>
                          <option value="ALTO">ALTO</option>
                          <option value="CRITICO">CRÍTICO</option>
                        </Select>
                      </div>
                    </div>
                  </>
                )}

                {activeTab === "riesgos" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Valor Scoring</Label>
                      <Input type="number" name="valor" defaultValue={editingItem?.valor || 0} className="h-12 rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Identificador Visual (Color)</Label>
                      <Select name="color" defaultValue={editingItem?.color || 'emerald'} className="h-12 rounded-xl">
                        <option value="emerald">Esmeralda (Seguro)</option>
                        <option value="amber">Ámbar (Precaución)</option>
                        <option value="orange">Naranja (Alerta)</option>
                        <option value="red">Rojo (Peligro)</option>
                      </Select>
                    </div>
                  </div>
                )}

                {activeTab === "intereses" && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Descripción</Label>
                      <Input name="descripcion" defaultValue={editingItem?.descripcion} placeholder="Detalle del servicio de interés" className="h-12 rounded-xl" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Frecuencia Sugerida (Días)</Label>
                        <Input type="number" name="frecuenciaSugerida" defaultValue={editingItem?.frecuenciaSugerida || 30} className="h-12 rounded-xl" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Riesgo Sugerido</Label>
                        <Select name="riesgoSugerido" defaultValue={editingItem?.riesgoSugerido || 'BAJO'} className="h-12 rounded-xl">
                          <option value="BAJO">BAJO</option>
                          <option value="MEDIO">MEDIO</option>
                          <option value="ALTO">ALTO</option>
                          <option value="CRITICO">CRÍTICO</option>
                        </Select>
                      </div>
                    </div>
                  </>
                )}

                <div className="flex items-start gap-2 p-4 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-100 dark:border-amber-900/30">
                  <Lightbulb className="h-4 w-4 text-amber-600 mt-0.5" />
                  <p className="text-[10px] font-bold text-amber-800 dark:text-amber-400 leading-tight">
                    Estos parámetros permiten que el sistema automatice recomendaciones, alertas y prioridades operativas.
                  </p>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800 mt-4">
                <Button type="button" variant="ghost" onClick={handleCloseModal} className="font-bold text-xs uppercase tracking-widest">Cancelar</Button>
                <Button type="submit" className="bg-azul-1 hover:bg-azul-1/90 text-white font-bold rounded-xl gap-2 h-12 px-10">
                  <Save className="h-4 w-4" /> GUARDAR CAMBIOS
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
