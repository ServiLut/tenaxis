"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  createEnterpriseAction,
  getEnterprisesAction,
  updateEnterpriseAction,
  deleteEnterpriseAction,
} from "@/app/dashboard/actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Save, X, Building, AlertTriangle, Trash2, Power, Loader2 } from "lucide-react";
import { cn } from "@/components/ui/utils";

type Enterprise = {
  id: string;
  nombre: string;
  activo: boolean;
};

export function ConfigEmpresas() {
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [enterprises, setEnterprises] = useState<Enterprise[]>([]);
  const [maxEmpresas, setMaxEmpresas] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Enterprise | null>(null);

  const limitReached = enterprises.length >= maxEmpresas && maxEmpresas > 0;

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const result = await getEnterprisesAction();
      // Si el backend devuelve el nuevo formato con items
      if (result && result.items) {
        setEnterprises(result.items);
        setMaxEmpresas(result.maxEmpresas);
      } else {
        setEnterprises(Array.isArray(result) ? result : []);
      }
    } catch (error) {
      console.error("Error loading enterprises:", error);
      toast.error("Error al cargar las empresas");
    } finally {
      setLoading(false);
    }
  }

  const handleOpenModal = (item: Enterprise | null = null) => {
    if (!item && limitReached) {
        toast.error("Has alcanzado el límite de empresas de tu plan");
        return;
    }
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingItem(null);
    setIsModalOpen(false);
  };

  const handleToggleStatus = async (item: Enterprise) => {
    setActionLoading(item.id);
    try {
      await updateEnterpriseAction(item.id, { activo: !item.activo });
      toast.success(`Empresa ${!item.activo ? 'activada' : 'desactivada'}`);
      loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al cambiar estado");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (item: Enterprise) => {
    if (!confirm(`¿Estás seguro de eliminar la empresa "${item.nombre}"?`)) return;
    
    setActionLoading(item.id);
    try {
      await deleteEnterpriseAction(item.id);
      toast.success("Empresa eliminada");
      loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al eliminar empresa");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
        nombre: formData.get('nombre') as string
    };

    try {
      if (editingItem) {
        await updateEnterpriseAction(editingItem.id, data);
        toast.success("Empresa actualizada");
      } else {
        await createEnterpriseAction(data);
        toast.success("Empresa creada");
      }
      loadData();
      handleCloseModal();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error al guardar la empresa";
      toast.error(message);
    }
  };

  return (
    <Card className="border-none shadow-xl shadow-zinc-200/50 rounded-3xl overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-8 sm:p-10 border-b border-zinc-100 dark:border-zinc-800">
        <div>
          <CardTitle className="text-xl font-black">
            Empresas
          </CardTitle>
          <CardDescription className="font-bold text-[10px] uppercase tracking-widest mt-1">
            Gestiona las empresas de tu tenant
          </CardDescription>
        </div>
        <div className="flex items-center gap-4">
          {limitReached && (
            <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-xs font-bold">
              <AlertTriangle className="h-4 w-4" />
              LÍMITE ALCANZADO ({enterprises.length}/{maxEmpresas})
            </div>
          )}
          <Button 
            onClick={() => handleOpenModal()} 
            disabled={limitReached}
            className="bg-azul-1 hover:bg-azul-1/90 text-white font-bold rounded-xl gap-2 h-11 px-6 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4" /> AGREGAR NUEVA
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-8 sm:p-10">
        {loading ? (
          <div className="flex h-40 items-center justify-center text-zinc-400 font-bold uppercase tracking-widest animate-pulse">Cargando empresas...</div>
        ) : (
          <div className="grid gap-4">
            {enterprises.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-6 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 hover:border-azul-1/20 transition-colors">
                <div className="flex gap-4 items-center">
                  <div className="h-12 w-12 rounded-xl bg-white dark:bg-zinc-800 flex items-center justify-center border border-zinc-200 dark:border-zinc-700 shadow-sm">
                    <Building className="h-6 w-6 text-azul-1" />
                  </div>
                  <div>
                    <h4 className="font-black text-zinc-900 dark:text-white leading-none">{item.nombre}</h4>
                    <span className={cn(
                      "inline-block mt-2 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md",
                      item.activo ? "bg-emerald-100 text-emerald-700" : "bg-zinc-200 text-zinc-500"
                    )}>
                      {item.activo ? "Activa" : "Inactiva"}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleToggleStatus(item)}
                    disabled={actionLoading === item.id}
                    title={item.activo ? "Desactivar" : "Activar"}
                    className={cn(
                      "h-10 w-10 rounded-full shadow-sm border border-transparent transition-all",
                      item.activo 
                        ? "text-emerald-600 hover:bg-emerald-50 hover:border-emerald-100" 
                        : "text-zinc-400 hover:bg-zinc-100 hover:border-zinc-200"
                    )}
                  >
                    {actionLoading === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleOpenModal(item)} 
                    disabled={actionLoading === item.id}
                    title="Editar"
                    className="h-10 w-10 rounded-full hover:bg-white hover:text-azul-1 shadow-sm border border-transparent hover:border-zinc-200 transition-all"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleDelete(item)}
                    disabled={actionLoading === item.id}
                    title="Eliminar"
                    className="h-10 w-10 rounded-full hover:bg-red-50 hover:text-red-600 shadow-sm border border-transparent hover:border-red-100 transition-all"
                  >
                    {actionLoading === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            ))}
            {!loading && enterprises.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
                <Building className="h-12 w-12 mb-4 opacity-20" />
                <p className="font-black uppercase tracking-widest text-xs">No hay empresas configuradas</p>
              </div>
            )}
          </div>
        )}
      </CardContent>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-lg animate-in fade-in zoom-in duration-200 border-none shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-2xl font-black">
                  {editingItem ? 'Editar' : 'Agregar'} Empresa
                </CardTitle>
                <CardDescription className="font-bold text-[10px] uppercase tracking-widest mt-1">Completa los campos para guardar los cambios</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={handleCloseModal} className="h-10 w-10 rounded-full">
                <X className="h-5 w-5" />
              </Button>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Nombre de la Empresa</Label>
                  <Input name="nombre" defaultValue={editingItem?.nombre} required placeholder="Ej: Mi Empresa SAS" className="h-12 rounded-xl" />
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
    </Card>
  );
}
