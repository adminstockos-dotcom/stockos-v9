import { useState } from 'react'

export default function CrearEmpresa({ onSubmit, onCancel }) {
  const [form, setForm] = useState({
    nombre: '',
    encargado: '',
    cargo: '',
    whatsapp: '',
    email: '',
    logo: null,
  })
  const [logoPreview, setLogoPreview] = useState(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleLogo = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result)
        setForm(prev => ({ ...prev, logo: reader.result }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(form)
  }

  return (
    <div className="card !p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Nombre empresa *</label>
            <input
              name="nombre"
              className="input"
              placeholder="Ej: Comercial Andina S.A."
              value={form.nombre}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <label className="label">Encargado *</label>
            <input
              name="encargado"
              className="input"
              placeholder="Nombre del encargado"
              value={form.encargado}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <label className="label">Cargo *</label>
            <input
              name="cargo"
              className="input"
              placeholder="Ej: Gerente Comercial"
              value={form.cargo}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <label className="label">WhatsApp *</label>
            <input
              name="whatsapp"
              className="input"
              placeholder="+56 9 1234 5678"
              value={form.whatsapp}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <label className="label">Email *</label>
            <input
              name="email"
              type="email"
              className="input"
              placeholder="empresa@correo.cl"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <label className="label">Subir logo</label>
            <div className="flex items-center gap-4">
              <label className="btn-secondary cursor-pointer">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Seleccionar
                <input type="file" accept="image/*" className="hidden" onChange={handleLogo} />
              </label>
              {logoPreview && (
                <img src={logoPreview} alt="Logo preview" className="w-10 h-10 rounded-lg object-cover border border-gray-200" />
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <button type="button" onClick={onCancel} className="btn-secondary">Cancelar</button>
          <button type="submit" className="btn-primary">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Crear Empresa
          </button>
        </div>
      </form>
    </div>
  )
}
