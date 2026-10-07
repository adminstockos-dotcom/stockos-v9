import { useState } from 'react'

export default function SuperAdmin(){
  const [showInfra,setShowInfra]=useState(false)
  //... deja todo tu código existente de empresas, estados, etc. NO LO BORRES

  return(
    <div className="min-h-screen bg-[#f8f9fa]">
      {/* HEADER - NO TOCAR */}
      <div className="h-14 bg-[#0E2A4D] flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 bg-white rounded-full flex items-center justify-center font-black">S</div>
          <span className="text-white font-black text-xs">STOCKOS</span>
        </div>
        <div className="flex items-center gap-2 text-white text-xs">
          <span className="flex items-center gap-1"><span className="h-2 w-2 bg-green-400 rounded-full"></span> Sistema Activo</span>
          <span className="ml-4">Super Admin</span>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* 1. CREAR EMPRESA - AHORA PRIMERO */}
        <div className="bg-white rounded-xl border p-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="font-black text-sm">Crear Empresa</h2>
              <p className="text-xs text-gray-500">Registra una nueva empresa en el sistema</p>
            </div>
            <button className="bg-blue-600 text-white px-4 py-2 rounded text-xs font-black">+ Nueva Empresa</button>
          </div>
        </div>

        {/* 2. EMPRESAS REGISTRADAS - AHORA SEGUNDO */}
        <div>
          <h2 className="font-black text-sm">Empresas Registradas</h2>
          <p className="text-xs text-gray-500 mb-3">2 empresas en el sistema</p>
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="grid grid-cols-5 text- font-black bg-gray-50 p-3 text-gray-500">
              <span>LOGO</span><span>EMPRESA</span><span>ENCARGADO</span><span>ESTADO</span><span>ACCIONES</span>
            </div>
            {/* AQUÍ DEJA TU MAPEO EXISTENTE DE EMPRESAS - NO LO BORRES */}
            <div className="p-4 text-xs text-gray-400">... tu tabla existente de empresas...</div>
          </div>
        </div>

        {/* 3. INFRA SISTEMA - AHORA AL FINAL Y DESPLEGABLE */}
        <div className="bg-white rounded-xl border">
          <button
            onClick={()=>setShowInfra(!showInfra)}
            className="w-full flex justify-between items-center p-4 hover:bg-gray-50"
          >
            <div className="text-left">
              <h2 className="font-black text-sm flex items-center gap-2">
                Infra Sistema
                <span className="text- text-gray-500 font-normal">{showInfra?'▲ Ocultar':'▼ Ver infraestructura'}</span>
              </h2>
              <p className="text-xs text-gray-500">6 servicios AWS monitoreados en tiempo real</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-green-600 font-bold flex items-center gap-1">● Todos operativos</span>
              <span className="bg-blue-600 text-white px-3 py-1 rounded text- font-black">+ Nuevo Servicio</span>
            </div>
          </button>

          {showInfra && (
            <div className="border-t">
              <div className="grid grid-cols-7 text- font-bold text-gray-500 p-3 bg-gray-50">
                <span>SERVICIO</span><span>TIPO</span><span>REGIÓN</span><span>ESTADO</span><span>UPTIME</span><span>CPU</span><span>MEMORIA</span>
              </div>
              {/* DEJA TU TABLA EXISTENTE DE EC2, RDS, etc. TAL CUAL ESTÁ */}
              <div className="p-2">
                {/* EC2, RDS, ElastiCache, CloudFront, ALB, S3 - NO TOCAR SU LÓGICA */}
                <div className="text-xs p-3">... tu tabla de infra existente...</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
