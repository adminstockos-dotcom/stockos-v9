{showCarrito && (
  <div className="fixed inset-0 bg-black/50 z-50 flex justify-end" onClick={()=>setShowCarrito(false)}>
    <div className="bg-white w- h-full p-4 overflow-auto" onClick={e=>e.stopPropagation()}>
      <div className="flex justify-between items-center mb-3"><h2 className="font-black text-sm">CARRITO ({total}) - TOTAL ${totalPrecio.toLocaleString()}</h2><button onClick={()=>setShowCarrito(false)} className="font-black">X</button></div>

      <div className="space-y-2 text-xs">
        {carrito.map(c=><div key={c.id} className="flex justify-between py-1 border-b"><span>{c.referencia} x{c.qty}</span><span>${(c.precio*c.qty).toLocaleString()}</span></div>)}
      </div>

      {/* DATOS CLIENTE */}
      <div className="mt-4 space-y-2">
        <h3 className="font-black text-xs">DATOS DE ENVÍO</h3>
        <input id="cli_nombre" placeholder="Nombre completo" className="w-full border p-2 rounded text-xs"/>
        <input id="cli_tel" placeholder="WhatsApp" className="w-full border p-2 rounded text-xs"/>
        <input id="cli_ciudad" placeholder="Ciudad" className="w-full border p-2 rounded text-xs"/>
        <input id="cli_dir" placeholder="Dirección + Barrio" className="w-full border p-2 rounded text-xs"/>
      </div>

      {/* METODOS DE PAGO */}
      <div className="mt-4">
        <h3 className="font-black text-xs mb-2">MÉTODO DE PAGO</h3>
        <div className="space-y-1 text-xs">
          <label className="flex gap-2 border p-2 rounded cursor-pointer"><input type="radio" name="pago" value="NEQUI" defaultChecked/> NEQUI 3186411851 - Automático</label>
          <label className="flex gap-2 border p-2 rounded cursor-pointer"><input type="radio" name="pago" value="BANCOLOMBIA"/> BANCOLOMBIA 9127560414 - Ahorros</label>
          <label className="flex gap-2 border p-2 rounded cursor-pointer"><input type="radio" name="pago" value="BRE-B"/> LLAVE BRE-B 83615157565</label>
          <label className={`flex gap-2 border p-2 rounded cursor-pointer ${total>2?'opacity-40':''}`}><input type="radio" name="pago" value="CONTRAENTREGA" disabled={total>2}/> CONTRAENTREGA {total>2?' (Max 2 pares primer pedido)':''}</label>
        </div>
        {total>2 && <p className="text- text-red-600 mt-1 font-bold">Contraentrega solo habilitada para primer pedido máximo 2 pares</p>}
      </div>

      <button onClick={async()=>{
        const nombre=document.getElementById('cli_nombre').value
        const tel=document.getElementById('cli_tel').value
        const ciudad=document.getElementById('cli_ciudad').value
        const dir=document.getElementById('cli_dir').value
        const pago=document.querySelector('input[name="pago"]:checked')?.value
        if(!nombre||!tel||!ciudad||!dir){alert('Completa datos de envío');return}
        if(pago==='CONTRAENTREGA' && total>2){alert('Contraentrega max 2 pares primer pedido');return}

        const {data,error}=await supabase.from('pedidos').insert({
          empresa_id: empresa.id,
          cliente_nombre: nombre,
          cliente_telefono: tel,
          cliente_ciudad: ciudad,
          cliente_direccion: dir,
          cliente: {nombre, telefono:tel, ciudad, direccion:dir},
          carrito: carrito,
          total_pares: total,
          total_precio: totalPrecio,
          metodo_pago: pago,
          estado: pago==='NEQUI'?'PENDIENTE_NEQUI':'PENDIENTE',
          numero_guia: 'GUIA-'+Date.now().toString().slice(-6)
        }).select().single()

        if(error){alert('Error: '+error.message);return}

        const msg=`Hola MÁXIMA soy ${nombre} - ${ciudad} - Pedido ${total} pares $${totalPrecio} - Pago ${pago} - Dir ${dir}`
        window.open(`https://wa.me/573008901150?text=${encodeURIComponent(msg)}`,'_blank')

        if(pago==='NEQUI'){
          alert('Pedido creado. Ahora paga al Nequi 3186411851 y se aprueba automático')
        } else {
          alert('Pedido creado. Carlos lo aprobará en STOCKOS y llega a despacho')
        }
        setCarrito([])
        setShowCarrito(false)
      }} className="w-full bg-[#0E2A4D] text-white py-3 rounded-full font-black mt-4 text-xs">ENVIAR PEDIDO</button>
    </div>
  </div>
)}
