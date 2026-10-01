/**
 * Clasificación ABC basada en valor de inventario (precio_costo × stock_actual)
 * A: 80% del valor total | B: 15% | C: 5%
 */
export function clasificarABC(productos) {
  if (!productos?.length) return { A: [], B: [], C: [], resumen: [] }

  const conValor = productos
    .filter((p) => p.activo !== false)
    .map((p) => ({
      ...p,
      valor_inventario: (Number(p.precio_costo) || 0) * (Number(p.stock_actual) || 0),
    }))
    .sort((a, b) => b.valor_inventario - a.valor_inventario)

  const valorTotal = conValor.reduce((acc, p) => acc + p.valor_inventario, 0)

  let acumulado = 0
  const clasificados = conValor.map((p) => {
    acumulado += p.valor_inventario
    const porcentaje = valorTotal > 0 ? (acumulado / valorTotal) * 100 : 0
    let categoria = 'C'
    if (porcentaje <= 80) categoria = 'A'
    else if (porcentaje <= 95) categoria = 'B'
    return { ...p, porcentaje_acumulado: porcentaje, categoria }
  })

  return {
    A: clasificados.filter((p) => p.categoria === 'A'),
    B: clasificados.filter((p) => p.categoria === 'B'),
    C: clasificados.filter((p) => p.categoria === 'C'),
    resumen: clasificados,
    valorTotal,
  }
}

export function formatearCLP(valor) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(Number(valor) || 0)
}
