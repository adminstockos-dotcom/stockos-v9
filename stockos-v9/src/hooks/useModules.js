export function useModules(subdomainParam) {
  const subdomain = subdomainParam || localStorage.getItem('subdomain_actual') || 'virtualclass512'

  const getModules = () => {
    try {
      const raw = localStorage.getItem(`modulos_${subdomain}`)
      if (!raw) {
        return {
          personas_roles: true,
          escaner_abc: true,
          catalogo_publico: true,
          campanas_ia: true,
          disparo_link: true,
          despachos_crm: true,
          bodega_stock: true,
          componentes: {},
        }
      }
      return JSON.parse(raw)
    } catch {
      return {}
    }
  }

  const modules = getModules()

  const isEnabled = (key) => modules[key] !== false
  const isComponentEnabled = (mod, comp) => modules.componentes?.[`${mod}_${comp}`] !== false

  return { subdomain, modules, isEnabled, isComponentEnabled }
}
