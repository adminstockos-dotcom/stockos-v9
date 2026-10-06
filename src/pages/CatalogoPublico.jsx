// Reemplaza todo el paso 3 por esto:
{paso===3 && (
  <div className="space-y-3">
    <div onClick={()=>seleccionarPago('NEQUI')} className={`border-2 p-3 rounded flex justify-between items-center cursor-pointer ${metodoPago==='NEQUI'?'border-black bg-gray-50':''}`}>
      <span className="text-xs font-black flex items-center gap-2">💜 NEQUI {metodoPago==='NEQUI'?'✅ Copiado':''}</span>
      <input type="radio" checked={metodoPago==='NEQUI'} readOnly/>
    </div>

    <div onClick={()=>seleccionarPago('BANCOLOMBIA')} className={`border-2 p-3 rounded flex justify-between items-center cursor-pointer ${metodoPago==='BANCOLOMBIA'?'border-black bg-gray-50':''}`}>
      <span className="text-xs font-black flex items-center gap-2">🏦 Bancolombia {metodoPago==='BANCOLOMBIA'?'✅ Copiado':''}</span>
      <input type="radio" checked={metodoPago==='BANCOLOMBIA'} readOnly/>
    </div>

    <div onClick={()=>seleccionarPago('BRE-B')} className={`border-2 p-3 rounded flex justify-between items-center cursor-pointer ${metodoPago==='BRE-B'?'border-black bg-gray-50':''}`}>
      <span className="text-xs font-black flex items-center gap-2">⚡ Llave Bre-B {metodoPago==='BRE-B'?'✅ Copiado':''}</span>
      <input type="radio" checked={metodoPago==='BRE-B'} readOnly/>
    </div>

    <label className={`border-2 p-3 rounded block ${metodoPago==='CONTRAENTREGA'?'border-green-600 bg-green-50':''} ${!esContraentregaValida?'opacity-60':''}`}>
      <div className="flex justify-between items-center">
        <div><div className="font-black text-xs">Contraentrega</div><div className="text-">Hasta 2 pares max 1ra vez + anticipo</div></div>
        <input type="radio" disabled={!esContraentregaValida} checked={metodoPago==='CONTRAENTREGA'} readOnly onChange={()=>setMetodoPago('CONTRAENTREGA')}/>
      </div>
    </label>

    <button onClick={finalizarPedido} className="w-full bg-[#0f2d52] text-white py-4 rounded font-black text-xs mt-4">FINALIZAR - ENVIAR A {WHATSAPP_CONFIRMACION}</button>
  </div>
)}
