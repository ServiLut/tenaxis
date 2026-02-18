"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  createEnterpriseAction,
  getEnterprisesAction,
} from "../../actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Save, X, Building } from "lucide-react";
import { cn } from "@/components/ui/utils";

type Enterprise = {
  id: string;
  nombre: string;
};

export default function EmpresasPage() {
  const [loading, setLoading] = useState(true);
  const [enterprises, setEnterprises] = useState<Enterprise[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Enterprise | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const ents = await getEnterprisesAction();
      setEnterprises(ents);
    } catch (error) {
      console.error("Error loading enterprises:", error);
      toast.error("Error al cargar las empresas");
    } finally {
      setLoading(false);
    }
  }

  const handleOpenModal = (item: Enterprise | null = null) => {
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
    const data = {
        nombre: formData.get('nombre') as string
    };

    try {
      if (editingItem) {
        // await updateEnterpriseAction(editingItem.id, data);
        toast.success("Empresa actualizada");
      } else {
        await createEnterpriseAction(data);
        toast.success("Empresa creada");
      }
      loadData();
      handleCloseModal();
    } catch (error: any) {
      toast.error(error.message || "Error al guardar la empresa");
    }
  };

  return (
    <Card className="border-none shadow-xl shadow-zinc-200/50">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-8">
        <div>
          <CardTitle className="text-xl font-black">
            Empresas
          </CardTitle>
          <CardDescription className="font-bold text-[10px] uppercase tracking-widest mt-1">
            Gestiona las empresas de tu tenant
          </CardDescription>
        </div>
        <Button onClick={() => handleOpenModal()} className="bg-azul-1 hover:bg-azul-1/90 text-white font-bold rounded-xl gap-2 h-11 px-6">
          <Plus className="h-4 w-4" /> AGREGAR NUEVA
        </Button>
      </CardHeader>
      <CardContent>
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
                    <h4 className="font-black text-zinc-900 dark:text-white">{item.nombre}</h4>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleOpenModal(item)} className="h-10 w-10 rounded-full hover:bg-white hover:text-azul-1 shadow-sm border border-transparent hover:border-zinc-200">
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {!loading && enterprises.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
                <Building className="h-12 w-12 mb-4 opacity-20" />
                <p className="font-bold uppercase tracking-widest text-xs">No hay empresas configuradas</p>
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
