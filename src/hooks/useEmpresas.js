import { useState, useEffect } from 'react'

const STORAGE_KEY = 'stockos_empresas'

const DEFAULT_EMPRESAS = [
  { id: 1, nombre: 'Comercial Andina S.A.', inicial: 'C', color: 'bg-blue-500', encargado: 'Carlos Mendoza', cargo: 'Gerente Comercial', whatsapp: '+56 9 1234 5678', telefono: '+56 9 1234 5678', email: 'carlos@andina.cl', nit: '', direccion: '', logo: null, estado: 'Aprobada', fecha: '2026-09-01' },
  { id: 2, nombre: 'Distribuidora El Roble', inicial: 'D', color: 'bg-green-500', encargado: 'Maria Gonzalez', cargo: 'Jefa de Ventas', whatsapp: '+56 9 2345 6789', telefono: '+56 9 2345 6789', email: 'maria.g@elroble.cl', nit: '', direccion: '', logo: null, estado: 'Aprobada', fecha: '2026-09-05' },
  { id: 21, nombre: 'MÁXIMA IMPORTADORES', inicial: 'M', color: 'bg-orange-600', encargado: 'Administrador', cargo: 'Gerente', whatsapp: '+57 3000000000', telefono: '+57 3000000000', email: 'maxima@importadores.com', nit: '14836265-4', direccion: 'Megacentro - Local MÁXIMA', logo: null, estado: 'Aprobada', fecha: '2026-10-01' },
  { id: 22, nombre: 'Seguros Confianza', inicial: 'S', color: 'bg-orange-600', encargado: 'Valentina Ortiz', cargo: 'Gerente General', whatsapp: '+56 9 2334 4455', telefono: '+56 9 2334 4455', email: 'vortiz@confianza.cl', nit: '', direccion: '', logo: null, estado: 'Aprobada', fecha: '2026-09-28' },
  { id: 23, nombre: 'Consultora Estrategica', inicial: 'C', color: 'bg-blue-600', encargado: 'Sebastian Vargas', cargo: 'Socio Director', whatsapp: '+56 9 3445 5566', telefono: '+56 9 3445 5566', email: 'svargas@consultora.cl', nit: '', direccion: '', logo: null, estado: 'Aprobada', fecha: '2026-09-28' },
  { id: 24, nombre: 'Eventos y Producciones', inicial: 'E', color: 'bg-green-600', encargado: 'Daniela Reyes', cargo: 'Productora General', whatsapp: '+56 9 4556 6677', telefono: '+56 9 4556 6677', email: 'dreyes@eventosyp.cl', nit: '', direccion: '', logo: null, estado: 'Aprobada', fecha: '2026-09-28' },
]

export function useEmpresas() {
  const [empresas, setEmpresas] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if(stored){
        const parsed = JSON.parse(stored)
        // FIX: Si el localStorage tiene la 21 como Inmobiliaria, la actualizamos a MAXIMA
        const fixed = parsed.map(e => {
          if(Number(e.id)===21){
            return {...e, nombre: 'MÁXIMA IMPORTADORES', nit: e.nit || '14836265-4', direccion: e.direccion || 'Megacentro - Local MÁXIMA', telefono: e.telefono || e.whatsapp || '+57 3000000000', email: e.email || 'maxima@importadores.com' }
          }
          return e
        })
        // Si no existe la 21, la agregamos
        if(!fixed.find(e=>Number(e.id)===21)){
          fixed.unshift({ id: 21, nombre: 'MÁXIMA IMPORTADORES', inicial: 'M', color: 'bg-orange-600', encargado: 'Administrador', cargo: 'Gerente', whatsapp: '+57 3000000000', telefono: '+57 3000000000', email: 'maxima@importadores.com', nit: '14836265-4', direccion: 'Megacentro - Local MÁXIMA', logo: null, estado: 'Aprobada', fecha: '2026-10-01' })
        }
        return fixed
      }
      return DEFAULT_EMPRESAS
    } catch {
      return DEFAULT_EMPRESAS
    }
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(empresas))
  }, [empresas])

  const addEmpresa = (empresa) => {
    const newId = Math.max(...empresas.map(e => e.id), 0) + 1
    const nueva = {...empresa, id: newId, fecha: new Date().toISOString().split('T')[0] }
    setEmpresas(prev => [nueva,...prev])
    return nueva
  }

  const updateEmpresa = (id, updates) => {
    setEmpresas(prev => prev.map(e => e.id === Number(id)? {...e,...updates } : e))
  }

  const deleteEmpresa = (id) => {
    setEmpresas(prev => prev.filter(e => e.id!== Number(id)))
  }

  const getEmpresa = (id) => {
    return empresas.find(e => e.id === Number(id))
  }

  return { empresas, addEmpresa, updateEmpresa, deleteEmpresa, getEmpresa }
}