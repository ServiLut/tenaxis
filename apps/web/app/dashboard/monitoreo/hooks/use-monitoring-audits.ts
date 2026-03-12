"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAudits } from "../actions";
import { toast } from "sonner";
import { Audit } from "../types";

export function useMonitoringAudits(date?: string) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");

  const auditsQuery = useQuery({
    queryKey: ["monitoring", "audits", currentPage, date],
    queryFn: () => getAudits(currentPage, 20, date),
    staleTime: 60000,
    retry: 2,
  });

  useEffect(() => {
    if (auditsQuery.isError) {
      toast.error("Error al sincronizar auditorías del servidor");
    }
  }, [auditsQuery.isError]);

  const auditsData = useMemo(() => {
    const response = auditsQuery.data;
    
    if (!response || !response.data) {
      return { 
        results: [] as Audit[], 
        meta: { total: 0, page: currentPage, limit: 20, totalPages: 1 } 
      };
    }
    
    const results = Array.isArray(response.data) ? response.data : [];
    
    return { 
      results, 
      meta: response.meta || { total: results.length, page: currentPage, limit: 20, totalPages: 1 } 
    };
  }, [auditsQuery.data, currentPage]);

  const filteredAudits = useMemo(() => {
    const results = auditsData.results || [];
    
    return results.filter((audit: Audit) => {
      if (!searchQuery) return true;
      const searchStr = searchQuery.toLowerCase();
      
      const entidad = (audit.entidad || "").toLowerCase();
      const accion = (audit.accion || "").toLowerCase();
      const nombre = (audit.membership?.user?.nombre || "").toLowerCase();
      const apellido = (audit.membership?.user?.apellido || "").toLowerCase();
      const username = (audit.membership?.username || "").toLowerCase();

      return (
        entidad.includes(searchStr) ||
        accion.includes(searchStr) ||
        nombre.includes(searchStr) ||
        apellido.includes(searchStr) ||
        username.includes(searchStr)
      );
    });
  }, [auditsData.results, searchQuery]);

  return {
    audits: filteredAudits,
    meta: auditsData.meta,
    currentPage,
    setCurrentPage,
    lastUpdated: auditsQuery.dataUpdatedAt,
    isLoading: auditsQuery.isLoading,
    isRefreshing: auditsQuery.isFetching,
    isError: auditsQuery.isError,
    searchQuery,
    setSearchQuery,
    fetchAudits: () => auditsQuery.refetch()
  };
}
