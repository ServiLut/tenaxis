"use client";

import React, { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/dashboard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  CreditCard, 
  Plus, 
  Trash2, 
  Pencil, 
  Camera, 
  Clock, 
  Calendar as CalendarIcon,
  X,
  Save,
  Image as ImageIcon,
  Calculator,
  Lock,
  History,
  FileSpreadsheet,
  Eye,
  } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/components/ui/utils";
import { createClient } from "@/utils/supabase/client";
import { type ShiftType, type PeriodType, type UserProfileType } from "../schemas/user.schema";
import { differenceInMinutes, parse, format } from "date-fns";
import { exportToPDF } from "@/lib/utils/export-helper";

const STORAGE_KEY = "user-shifts";
const PERIODS_KEY = "user-periods";

export default function CuentaCobroPage() {
  const [activeTab, setActiveTab] = useState<"actual" | "pagos">("actual");
  const [shifts, setShifts] = useState<ShiftType[]>([]);
  const [periods, setPeriods] = useState<PeriodType[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType | null>(null);
  const [editingShift, setEditingShift] = useState<ShiftType | null>(null);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<UserProfileType | null>(null);
  const [valorHora, setValorHora] = useState<number>(0);
  
  // Form state
  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    horaEntrada: "08:00",
    horaSalida: "17:00",
    descansoMinutos: 60,
    observacion: "",
    fotoLlegada: "",
    fotoSalida: ""
  });

  const fotoLlegadaRef = useRef<HTMLInputElement>(null);
  const fotoSalidaRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Load shifts
    const savedShifts = localStorage.getItem(STORAGE_KEY);
    if (savedShifts) {
      try {
        setShifts(JSON.parse(savedShifts));
      } catch (e) { console.error("Error loading shifts", e);
      }
    }

    // Load periods
    const savedPeriods = localStorage.getItem(PERIODS_KEY);
    if (savedPeriods) {
      try {
        setPeriods(JSON.parse(savedPeriods));
      } catch (e) { console.error("Error loading periods", e);
      }
    }

    // Load user data
    const userData = localStorage.getItem("user");
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        const vh = parsedUser.valorHora || 0;
        setValorHora(vh);
        if (vh <= 0) {
          toast.warning("Configura tu valor por hora en Perfil para establecer honorarios");
        }
      } catch (e) { console.error("Error loading user data", e);
      }
    }
  }, []);

  const saveToStorage = (newShifts: ShiftType[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newShifts));
    setShifts(newShifts);
  };

  const savePeriodsToStorage = (newPeriods: PeriodType[]) => {
    localStorage.setItem(PERIODS_KEY, JSON.stringify(newPeriods));
    setPeriods(newPeriods);
  };

  const handleOpenModal = (shift: ShiftType | null = null) => {
    if (shift) {
      setEditingShift(shift);
      setFormData({
        fecha: shift.fecha,
        horaEntrada: shift.horaEntrada,
        horaSalida: shift.horaSalida,
        descansoMinutos: shift.descansoMinutos,
        observacion: shift.observacion || "",
        fotoLlegada: shift.fotoLlegada || "",
        fotoSalida: shift.fotoSalida || ""
      });
    } else {
      setEditingShift(null);
      setFormData({
        fecha: new Date().toISOString().split('T')[0],
        horaEntrada: "08:00",
        horaSalida: "17:00",
        descansoMinutos: 60,
        observacion: "",
        fotoLlegada: "",
        fotoSalida: ""
      });
    }
    setIsModalOpen(true);
  };

  const handleUpload = async (file: File, type: 'llegada' | 'salida') => {
    setLoading(true);
    const supabase = createClient();
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    
    const filePath = `evidencias/${fileName}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('tenaxis-docs')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('tenaxis-docs')
        .getPublicUrl(filePath);

      setFormData(prev => ({
        ...prev,
        [type === 'llegada' ? 'fotoLlegada' : 'fotoSalida']: publicUrl
      }));
      toast.success("Foto subida correctamente");
    } catch (_error) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64String = e.target?.result as string;
        if (base64String) {
          setFormData(prev => ({
            ...prev,
            [type === 'llegada' ? 'fotoLlegada' : 'fotoSalida']: base64String
          }));
          toast.info("Foto guardada localmente (Modo Offline)");
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setLoading(false);
    }
  };

  const calculateHours = (entrada: string, salida: string, descanso: number) => {
    try {
      if (!entrada || !salida) return 0;
      const refDate = new Date();
      const start = parse(entrada, 'HH:mm', refDate);
      let end = parse(salida, 'HH:mm', refDate);
      
      if (end < start) {
        end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
      }
      
      const diffMinutes = differenceInMinutes(end, start);
      const netMinutes = diffMinutes - (descanso || 0);
      return Math.max(0, netMinutes / 60);
    } catch (_e) {
      return 0;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const totalHoras = calculateHours(formData.horaEntrada, formData.horaSalida, formData.descansoMinutos);
      const valorGenerado = totalHoras * (valorHora || 0);

      const newShift: ShiftType = {
        id: editingShift?.id || `shift-${Date.now()}`,
        ...formData,
        totalHoras,
        valorGenerado,
        createdAt: editingShift?.createdAt || new Date().toISOString()
      };

      let updatedShifts: ShiftType[];
      if (editingShift) {
        updatedShifts = shifts.map(s => s.id === editingShift.id ? newShift : s);
        toast.success("Turno actualizado");
      } else {
        updatedShifts = [newShift, ...shifts];
        toast.success("Turno registrado");
      }
      
      saveToStorage(updatedShifts);
      setIsModalOpen(false);
    } catch (_err) {
      toast.error("Error al guardar el turno");
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm("¿Eliminar este registro?")) {
      saveToStorage(shifts.filter(s => s.id !== id));
      toast.success("Registro eliminado");
    }
  };

  const handleCerrarPeriodo = () => {
    if (shifts.length === 0) return;
    if (!window.confirm("¿Cerrar periodo? Se agruparán todos los turnos para pago.")) return;

    const sortedShifts = [...shifts].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
    const valorTotal = shifts.reduce((acc, s) => acc + s.valorGenerado, 0);
    const horasTotales = shifts.reduce((acc, s) => acc + s.totalHoras, 0);

    const newPeriod: PeriodType = {
      id: `period-${Date.now()}`,
      fechaInicio: sortedShifts[0].fecha,
      fechaFin: sortedShifts[sortedShifts.length - 1].fecha,
      fechaCierre: new Date().toISOString(),
      numDias: shifts.length,
      valorTotal,
      horasTotales,
      shifts: [...shifts],
      userSnapshot: user || {}
    };

    savePeriodsToStorage([newPeriod, ...periods]);
    saveToStorage([]);
    toast.success("Periodo cerrado correctamente");
    setActiveTab("pagos");
  };

  const handleExportPDF = async (period: PeriodType) => {
    const headers = ["FECHA", "ENTRADA", "SALIDA", "DESCANSO", "HORAS NETAS", "VALOR"];
    
    // Formatear datos de la tabla
    const data = period.shifts.map(s => [
      format(new Date(s.fecha), 'dd/MM/yyyy'),
      s.horaEntrada,
      s.horaSalida,
      `${s.descansoMinutos} min`,
      s.totalHoras.toFixed(2),
      `$${s.valorGenerado.toLocaleString()}`
    ]);

    // Añadir fila de total al final de la tabla para mayor claridad
    data.push([
      "TOTALES", 
      "", 
      "", 
      "", 
      period.horasTotales.toFixed(2), 
      `$${period.valorTotal.toLocaleString()}`
    ]);

    const title = `CUENTA DE COBRO: ${period.userSnapshot.nombre} ${period.userSnapshot.apellido}`;
    const metadata = [
      `Documento: ${period.userSnapshot.tipoDocumento} ${period.userSnapshot.numeroDocumento}`,
      `Información Bancaria: ${period.userSnapshot.banco} - ${period.userSnapshot.tipoCuenta}: ${period.userSnapshot.numeroCuenta}`,
      `Periodo: ${format(new Date(period.fechaInicio), 'dd/MM/yyyy')} al ${format(new Date(period.fechaFin), 'dd/MM/yyyy')}`,
      `Total Liquidado: $${period.valorTotal.toLocaleString()}`
    ].join('\n');

    await exportToPDF({
      headers,
      data,
      filename: `Cuenta_Cobro_${period.userSnapshot.nombre}_${period.fechaInicio}`,
      title: `${title}\n\n${metadata}`
    });

    toast.success("PDF generado con diseño profesional");
  };

  const openPreview = (url: string) => {
    setPreviewUrl(url);
    setIsPreviewOpen(true);
  };

  const totalGenerado = (shifts || []).reduce((acc, s) => acc + (s.valorGenerado || 0), 0);
  const totalHorasMes = (shifts || []).reduce((acc, s) => acc + (s.totalHoras || 0), 0);

  return (
    <DashboardLayout overflowHidden>
      <div className="flex flex-col h-full bg-background">
        <div className="shrink-0 py-10 px-6 lg:px-10 border-b border-border bg-muted/30">
          <div className="max-w-[1600px] mx-auto w-full space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#01ADFB] text-white shadow-xl shadow-[#01ADFB]/20 transition-transform hover:scale-105">
                  <CreditCard className="h-7 w-7" />
                </div>
                <div>
                  <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-foreground leading-tight">
                    Cuenta de <span className="text-[#01ADFB]">Cobro</span>
                  </h1>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] mt-1">Gestión de Turnos y Honorarios</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="hidden sm:flex p-1 bg-muted rounded-2xl border border-border mr-4">
                  <button onClick={() => setActiveTab("actual")} className={cn("flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all", activeTab === "actual" ? "bg-background text-[#01ADFB] shadow-md" : "text-muted-foreground hover:text-foreground")}>
                    <Clock className="h-4 w-4" /> Actual
                  </button>
                  <button onClick={() => setActiveTab("pagos")} className={cn("flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all", activeTab === "pagos" ? "bg-background text-[#01ADFB] shadow-md" : "text-muted-foreground hover:text-foreground")}>
                    <History className="h-4 w-4" /> Pagos
                  </button>
                </div>
                {activeTab === "actual" && (
                  <Button type="button" onClick={() => handleOpenModal()} className="bg-[#01ADFB] hover:bg-blue-700 text-white font-black uppercase tracking-widest text-xs rounded-2xl h-14 px-8 shadow-xl shadow-[#01ADFB]/20 flex items-center gap-3"><Plus className="h-5 w-5" /> REGISTRAR</Button>
                )}
              </div>
            </div>

            {activeTab === "actual" && (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <Card className="p-6 rounded-[2rem] border-border bg-card flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600"><Calculator className="h-6 w-6" /></div>
                  <div><p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Generado</p><p className="text-2xl font-black text-foreground">${totalGenerado.toLocaleString()}</p></div>
                </Card>
                <Card className="p-6 rounded-[2rem] border-border bg-card flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600"><Clock className="h-6 w-6" /></div>
                  <div><p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Horas</p><p className="text-2xl font-black text-foreground">{totalHorasMes.toFixed(1)}h</p></div>
                </Card>
                <Card className="p-6 rounded-[2rem] border-border bg-card flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-600"><CalendarIcon className="h-6 w-6" /></div>
                  <div><p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Días</p><p className="text-2xl font-black text-foreground">{shifts.length}</p></div>
                </Card>
                <Button onClick={handleCerrarPeriodo} disabled={shifts.length === 0} className="h-full rounded-[2rem] border-2 border-dashed border-[#01ADFB]/30 bg-[#01ADFB]/5 hover:bg-[#01ADFB]/10 text-[#01ADFB] font-black uppercase tracking-widest text-xs flex flex-col gap-2"><Lock className="h-6 w-6" /> CERRAR CORTE</Button>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 lg:px-10 py-10">
          <div className="max-w-[1600px] mx-auto w-full pb-20">
            {activeTab === "actual" ? (
              <Card className="border-border shadow-2xl bg-card rounded-[2.5rem] overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-muted/30 border-b border-border">
                    <tr className="text-[10px] font-black uppercase text-muted-foreground">
                      <th className="p-6">Fecha / Horario</th>
                      <th className="p-6">Evidencias</th>
                      <th className="p-6">Descanso</th>
                      <th className="p-6 text-right">Valor</th>
                      <th className="p-6">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {shifts.length === 0 ? (
                      <tr><td colSpan={5} className="p-20 text-center font-black uppercase tracking-widest text-xs text-muted-foreground">No hay turnos registrados</td></tr>
                    ) : (
                      shifts.map((s) => (
                        <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                          <td className="p-6">
                            <p className="font-black text-foreground">{format(new Date(s.fecha), 'EEE dd MMM')}</p>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">{s.horaEntrada} - {s.horaSalida} ({s.totalHoras.toFixed(1)}h)</p>
                          </td>
                          <td className="p-6">
                            <div className="flex gap-2">
                              {s.fotoLlegada && <button onClick={() => openPreview(s.fotoLlegada!)} className="h-10 w-10 rounded-lg bg-muted border border-border flex items-center justify-center hover:border-[#01ADFB] transition-all"><ImageIcon className="h-5 w-5 text-muted-foreground" /></button>}
                              {s.fotoSalida && <button onClick={() => openPreview(s.fotoSalida!)} className="h-10 w-10 rounded-lg bg-muted border border-border flex items-center justify-center hover:border-orange-500 transition-all"><ImageIcon className="h-5 w-5 text-muted-foreground" /></button>}
                            </div>
                          </td>
                          <td className="p-6 text-xs font-black text-muted-foreground uppercase">{s.descansoMinutos} min</td>
                          <td className="p-6 text-right font-black text-emerald-600 text-lg">${s.valorGenerado.toLocaleString()}</td>
                          <td className="p-6">
                            <div className="flex gap-2">
                              <Button type="button" variant="ghost" size="icon" onClick={() => handleOpenModal(s)} className="rounded-xl"><Pencil className="h-4 w-4" /></Button>
                              <Button type="button" variant="ghost" size="icon" onClick={() => handleDelete(s.id)} className="rounded-xl text-red-500"><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </Card>
            ) : (
              <Card className="border-border shadow-2xl bg-card rounded-[2.5rem] overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-muted/30 border-b border-border">
                    <tr className="text-[10px] font-black uppercase text-muted-foreground">
                      <th className="p-6">Periodo Liquidado</th>
                      <th className="p-6">Días / Horas</th>
                      <th className="p-6 text-right">Valor Total</th>
                      <th className="p-6">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {periods.length === 0 ? (
                      <tr><td colSpan={4} className="p-20 text-center font-black uppercase tracking-widest text-xs text-muted-foreground">No hay pagos registrados</td></tr>
                    ) : (
                      periods.map((p) => (
                        <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                          <td className="p-6">
                            <p className="font-black text-foreground">{format(new Date(p.fechaInicio), 'dd MMM')} - {format(new Date(p.fechaFin), 'dd MMM')}</p>
                            <p className="text-[10px] font-bold text-[#01ADFB] uppercase">Cerrado: {format(new Date(p.fechaCierre), 'dd/MM/yyyy')}</p>
                          </td>
                          <td className="p-6 font-bold text-sm">{p.numDias} días / {p.horasTotales.toFixed(1)}h</td>
                          <td className="p-6 text-right font-black text-emerald-600 text-lg">${p.valorTotal.toLocaleString()}</td>
                          <td className="p-6">
                            <div className="flex gap-2">
                              <Button variant="ghost" size="sm" onClick={() => { setSelectedPeriod(p); setIsDetailModalOpen(true); }} className="text-[10px] font-black uppercase rounded-xl text-[#01ADFB]"><Eye className="h-4 w-4 mr-2" /> Detalles</Button>
                              <Button variant="ghost" size="sm" onClick={() => handleExportPDF(p)} className="text-[10px] font-black uppercase rounded-xl text-red-500"><FileSpreadsheet className="h-4 w-4 mr-2" /> PDF</Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Modal Turno */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <Card className="w-full max-w-2xl bg-card border-border shadow-2xl rounded-[2.5rem] overflow-hidden">
            <form onSubmit={handleSubmit}>
              <CardHeader className="p-8 border-b border-border flex flex-row items-center justify-between bg-muted/20">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-[#01ADFB]/10 flex items-center justify-center text-[#01ADFB]"><Clock className="h-6 w-6" /></div>
                  <div><CardTitle className="text-xl font-black text-foreground uppercase">{editingShift ? 'Editar' : 'Registrar'} Turno</CardTitle><CardDescription className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Completa los detalles de tu jornada</CardDescription></div>
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => setIsModalOpen(false)} className="h-12 w-12 rounded-full border border-border"><X className="h-6 w-6" /></Button>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-muted-foreground">Fecha</Label><Input type="date" value={formData.fecha} onChange={e => setFormData({...formData, fecha: e.target.value})} required className="h-12 rounded-xl border-border bg-background font-bold" /></div>
                  <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-muted-foreground">Descanso (Min)</Label><Input type="number" value={formData.descansoMinutos} onChange={e => setFormData({...formData, descansoMinutos: parseInt(e.target.value) || 0})} required className="h-12 rounded-xl border-border bg-background font-bold" /></div>
                  <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-muted-foreground">Entrada</Label><Input type="time" value={formData.horaEntrada} onChange={e => setFormData({...formData, horaEntrada: e.target.value})} required className="h-12 rounded-xl border-border bg-background font-bold text-[#01ADFB]" /></div>
                  <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-muted-foreground">Salida</Label><Input type="time" value={formData.horaSalida} onChange={e => setFormData({...formData, horaSalida: e.target.value})} required className="h-12 rounded-xl border-border bg-background font-bold text-orange-500" /></div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div onClick={() => fotoLlegadaRef.current?.click()} className={cn("h-32 rounded-2xl border-2 border-dashed border-border bg-muted/20 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-muted/40 relative overflow-hidden", formData.fotoLlegada && "border-[#01ADFB]/50")}>
                    {formData.fotoLlegada ? <>{/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={formData.fotoLlegada} alt="Llegada" className="absolute inset-0 w-full h-full object-cover opacity-40" /><Camera className="h-6 w-6 text-[#01ADFB] relative z-10" /></> : <><Camera className="h-6 w-6 text-muted-foreground" /><span className="text-[10px] font-black uppercase text-muted-foreground">Foto Llegada</span></>}
                    <input type="file" ref={fotoLlegadaRef} className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0], 'llegada')} />
                  </div>
                  <div onClick={() => fotoSalidaRef.current?.click()} className={cn("h-32 rounded-2xl border-2 border-dashed border-border bg-muted/20 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-muted/40 relative overflow-hidden", formData.fotoSalida && "border-orange-500/50")}>
                    {formData.fotoSalida ? <>{/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={formData.fotoSalida} alt="Salida" className="absolute inset-0 w-full h-full object-cover opacity-40" /><Camera className="h-6 w-6 text-orange-500 relative z-10" /></> : <><Camera className="h-6 w-6 text-muted-foreground" /><span className="text-[10px] font-black uppercase text-muted-foreground">Foto Salida</span></>}
                    <input type="file" ref={fotoSalidaRef} className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0], 'salida')} />
                  </div>
                </div>
                <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-muted-foreground">Notas</Label><Textarea value={formData.observacion} onChange={e => setFormData({...formData, observacion: e.target.value})} placeholder="..." className="rounded-2xl border-border bg-background" /></div>
              </CardContent>
              <div className="p-8 pt-0 border-t border-border mt-4 flex items-center justify-between bg-muted/10">
                <div><p className="text-[10px] font-black uppercase text-muted-foreground">Estimado</p><p className="text-xl font-black text-emerald-600">${(calculateHours(formData.horaEntrada, formData.horaSalida, formData.descansoMinutos) * (valorHora || 0)).toLocaleString()}</p></div>
                <div className="flex gap-3">
                  <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Cancelar</Button>
                  <Button type="submit" disabled={loading} className="bg-[#01ADFB] hover:bg-blue-700 text-white font-black uppercase tracking-widest text-[10px] rounded-xl h-12 px-10"><Save className="h-4 w-4 mr-2" /> {editingShift ? 'ACTUALIZAR' : 'REGISTRAR'}</Button>
                </div>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Modal Preview */}
      {isPreviewOpen && (
        <div onClick={() => setIsPreviewOpen(false)} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative max-w-4xl max-h-[90vh] w-full flex items-center justify-center">
            <button onClick={() => setIsPreviewOpen(false)} className="absolute -top-12 right-0 text-white hover:text-[#01ADFB] transition-colors"><X className="h-8 w-8" /></button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={previewUrl} alt="Preview" className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl border-2 border-white/10" />
            <div className="absolute -bottom-12 left-0 right-0 text-center"><p className="text-white/50 text-[10px] font-black uppercase tracking-[0.3em]">Vista previa de evidencia</p></div>
          </div>
        </div>
      )}

      {/* Modal Detalle Periodo */}
      {isDetailModalOpen && selectedPeriod && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <Card className="w-full max-w-4xl bg-card border-border shadow-2xl rounded-[2.5rem] overflow-hidden">
            <CardHeader className="p-8 border-b border-border flex flex-row items-center justify-between bg-muted/20">
              <div className="flex items-center gap-4"><div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600"><History className="h-6 w-6" /></div><div><CardTitle className="text-xl font-black text-foreground uppercase">Liquidación</CardTitle><CardDescription className="text-[10px] font-black uppercase text-muted-foreground">{format(new Date(selectedPeriod.fechaInicio), 'dd/MM/yyyy')} - {format(new Date(selectedPeriod.fechaFin), 'dd/MM/yyyy')}</CardDescription></div></div>
              <Button variant="ghost" size="icon" onClick={() => setIsDetailModalOpen(false)} className="h-12 w-12 rounded-full border border-border"><X className="h-6 w-6" /></Button>
            </CardHeader>
            <CardContent className="p-0 max-h-[60vh] overflow-y-auto">
              <div className="p-8 bg-muted/5 grid grid-cols-3 gap-6 border-b border-border">
                <div className="space-y-1"><p className="text-[10px] font-black uppercase text-muted-foreground">Colaborador</p><p className="font-bold text-foreground">{selectedPeriod.userSnapshot.nombre} {selectedPeriod.userSnapshot.apellido}</p></div>
                <div className="space-y-1 text-center"><p className="text-[10px] font-black uppercase text-muted-foreground">Días / Horas</p><p className="font-bold text-foreground">{selectedPeriod.numDias} / {selectedPeriod.horasTotales.toFixed(1)}h</p></div>
                <div className="space-y-1 text-right"><p className="text-[10px] font-black uppercase text-muted-foreground">Total Pago</p><p className="text-xl font-black text-emerald-600">${selectedPeriod.valorTotal.toLocaleString()}</p></div>
              </div>
              <table className="w-full text-left">
                <thead className="bg-muted/30 border-b border-border"><tr className="text-[10px] font-black uppercase text-muted-foreground"><th className="p-4 pl-8">Fecha</th><th className="p-4">Horario</th><th className="p-4">Evidencias</th><th className="p-4 text-right pr-8">Valor</th></tr></thead>
                <tbody className="divide-y divide-border">
                  {selectedPeriod.shifts.map((s) => (
                    <tr key={s.id} className="hover:bg-muted/10 transition-colors">
                      <td className="p-4 pl-8 text-sm font-bold">{format(new Date(s.fecha), 'dd/MM/yyyy')}</td>
                      <td className="p-4 text-sm font-medium">{s.horaEntrada}-{s.horaSalida} ({s.totalHoras.toFixed(1)}h)</td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          {s.fotoLlegada && (
                            <button onClick={() => openPreview(s.fotoLlegada!)} className="h-8 w-8 rounded-lg bg-muted border border-border flex items-center justify-center hover:border-[#01ADFB] transition-all group/ev">
                              <ImageIcon className="h-4 w-4 text-muted-foreground group-hover/ev:text-[#01ADFB]" />
                            </button>
                          )}
                          {s.fotoSalida && (
                            <button onClick={() => openPreview(s.fotoSalida!)} className="h-8 w-8 rounded-lg bg-muted border border-border flex items-center justify-center hover:border-orange-500 transition-all group/ev">
                              <ImageIcon className="h-4 w-4 text-muted-foreground group-hover/ev:text-orange-500" />
                            </button>
                          )}
                          {!s.fotoLlegada && !s.fotoSalida && <span className="text-[10px] text-muted-foreground italic">Sin fotos</span>}
                        </div>
                      </td>
                      <td className="p-4 text-right pr-8 font-black text-emerald-600">${s.valorGenerado.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
            <div className="p-8 border-t border-border flex justify-end gap-3 bg-muted/10">
              <Button onClick={() => handleExportPDF(selectedPeriod)} className="bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest text-[10px] rounded-xl h-12 px-8"><FileSpreadsheet className="h-4 w-4 mr-2" /> PDF</Button>
              <Button variant="ghost" onClick={() => setIsDetailModalOpen(false)} className="font-bold text-xs uppercase rounded-xl h-12 px-6">Cerrar</Button>
            </div>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
