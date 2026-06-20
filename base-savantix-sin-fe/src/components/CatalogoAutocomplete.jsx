import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Plus, Package, AlertCircle } from 'lucide-react';
import { formatCurrency } from '../lib/utils';

/**
 * Autocomplete para buscar repuestos en el catálogo.
 *
 * Props:
 * - value: { id_catalogo, sku, nombre, precio_venta, itbms_pct, stock_disponible } seleccionado
 * - onChange: callback con el item seleccionado
 * - onCreateNew: callback cuando el usuario quiere crear un nuevo item al vuelo
 * - placeholder
 * - disabled
 */
export default function CatalogoAutocomplete({ value, onChange, onCreateNew, placeholder, disabled }) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);

  // Inicializar con el valor seleccionado
  useEffect(() => {
    if (value?.nombre && !showDropdown) {
      setSearch(`${value.sku} · ${value.nombre}`);
    }
  }, [value]);

  // Buscar al teclear
  useEffect(() => {
    if (!showDropdown) return;
    const t = search.trim();
    if (t.length < 1) {
      // Cargar productos populares (todos los activos)
      setLoading(true);
      supabase
        .from('v_catalogo_completo')
        .select('id_catalogo, sku, nombre, marca, modelo, precio_venta, itbms_pct, stock_disponible, estado_stock')
        .eq('activo', true)
        .order('nombre')
        .limit(20)
        .then(({ data }) => {
          setResults(data || []);
          setLoading(false);
        });
      return;
    }

    setLoading(true);
    const tid = setTimeout(() => {
      supabase
        .from('v_catalogo_completo')
        .select('id_catalogo, sku, nombre, marca, modelo, precio_venta, itbms_pct, stock_disponible, estado_stock')
        .eq('activo', true)
        .or(`sku.ilike.%${t}%,nombre.ilike.%${t}%,marca.ilike.%${t}%,modelo.ilike.%${t}%`)
        .order('nombre')
        .limit(20)
        .then(({ data }) => {
          setResults(data || []);
          setLoading(false);
        });
    }, 200);
    return () => clearTimeout(tid);
  }, [search, showDropdown]);

  // Click fuera cierra
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowDropdown(false);
        // Si no hay value seleccionado, limpia el search
        if (!value?.id_catalogo) setSearch('');
        else setSearch(`${value.sku} · ${value.nombre}`);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [value]);

  const seleccionar = (item) => {
    onChange(item);
    setSearch(`${item.sku} · ${item.nombre}`);
    setShowDropdown(false);
  };

  const limpiar = () => {
    onChange(null);
    setSearch('');
    setShowDropdown(true);
  };

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          placeholder={placeholder || 'Buscar en el catálogo (SKU, nombre, marca)...'}
          value={search}
          disabled={disabled}
          onChange={e => { setSearch(e.target.value); setShowDropdown(true); if (value) onChange(null); }}
          onFocus={() => setShowDropdown(true)}
          className="w-full pl-10 pr-20 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
        />
        {value && (
          <button
            type="button"
            onClick={limpiar}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-red-600"
          >
            Limpiar
          </button>
        )}
      </div>

      {showDropdown && !disabled && (
        <div className="absolute z-30 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-72 overflow-y-auto">
          {loading ? (
            <div className="p-3 text-center text-sm text-gray-500">Buscando...</div>
          ) : results.length === 0 ? (
            <div className="p-3 text-center text-sm">
              <div className="text-gray-500 mb-2">No se encontraron repuestos</div>
              {onCreateNew && (
                <button
                  type="button"
                  onClick={() => { setShowDropdown(false); onCreateNew(search); }}
                  className="inline-flex items-center gap-1 text-brand-700 font-medium hover:underline text-xs"
                >
                  <Plus className="h-3 w-3" /> Crear nuevo repuesto "{search}"
                </button>
              )}
            </div>
          ) : (
            <>
              {results.map(item => {
                const sinStock = item.estado_stock === 'AGOTADO' || item.stock_disponible <= 0;
                return (
                  <button
                    key={item.id_catalogo}
                    type="button"
                    onClick={() => seleccionar(item)}
                    className="w-full px-3 py-2 text-left hover:bg-brand-50 border-b border-gray-100 last:border-b-0 flex items-start gap-2"
                  >
                    <Package className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-brand-700">{item.sku}</span>
                        <span className="text-sm font-medium truncate">{item.nombre}</span>
                      </div>
                      {(item.marca || item.modelo) && (
                        <div className="text-xs text-gray-500">{item.marca} {item.modelo}</div>
                      )}
                      <div className="text-xs flex gap-3 mt-0.5">
                        <span className="text-gray-600">{formatCurrency(item.precio_venta)}</span>
                        <span className="text-gray-500">ITBMS {item.itbms_pct}%</span>
                        <span className={sinStock ? 'text-red-600 font-medium' : 'text-emerald-600'}>
                          {sinStock ? (
                            <span className="inline-flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" /> Sin stock
                            </span>
                          ) : (
                            `Stock: ${item.stock_disponible}`
                          )}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
              {onCreateNew && (
                <button
                  type="button"
                  onClick={() => { setShowDropdown(false); onCreateNew(search); }}
                  className="w-full px-3 py-2 text-left hover:bg-brand-50 border-t border-gray-200 text-sm text-brand-700 font-medium flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" /> Crear nuevo repuesto al vuelo
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
