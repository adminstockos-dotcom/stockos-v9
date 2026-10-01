import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import LogoStockOS from '../components/LogoStockOS'

const ADMIN_EMAILS = ['superadmin@stockos.com', 'adminstockos@gmail.com']
const ADMIN_PASS = 'Sep7imo@ngel'

// Fallback demo
const USUARIOS_FALLBACK = [
  { user: 'demo', pass: 'demo', empresa: 'vc512' },
]

export default function Login() {
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [err, setErr] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [recordarme, setRecordarme] = useState(false)
  const nav = useNavigate()

  const login = () => {
    try {
      setErr('')
      const sEmail = import.meta.env.VITE_SUPERADMIN_EMAIL || ADMIN_EMAILS[0]
      const sPass = import.meta.env.VITE_SUPERADMIN_PASS || ADMIN_PASS

      const emailMatch = ADMIN_EMAILS.includes(email.toLowerCase().trim()) || email.toLowerCase().trim() === sEmail.toLowerCase()
      const passMatch = pass === ADMIN_PASS || pass === sPass

      if (emailMatch && passMatch) {
        localStorage.setItem('isSuperAdmin', 'true')
        if (recordarme) {
          localStorage.setItem('rememberedEmail', email)
        }
        nav('/superadmin')
      } else if (email === 'demo' && pass === 'demo') {
        // Fallback demo
        localStorage.setItem('isSuperAdmin', 'false')
        const empresaInit = localStorage.getItem('empresa_vc512_init')
        if (!empresaInit) {
          localStorage.setItem('empresa_vc512_init', 'true')
          localStorage.setItem('vc512_campanas_ia', JSON.stringify([]))
          localStorage.setItem('vc512_conectores', JSON.stringify({}))
        }
        nav('/empresa/vc512')
      } else {
        setErr('Credenciales incorrectas')
      }
    } catch (e) {
      setErr('Error login: ' + e.message)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-md w-96 text-center">
        <div className="mb-4 flex justify-center">
          <LogoStockOS size="text-2xl" />
        </div>
        <p className="text-gray-500 text-sm mb-6">Acceso SuperAdmin</p>

        <input
          className="w-full border p-3 mb-4 rounded text-left"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <div className="relative mb-4">
          <input
            className="w-full border p-3 rounded text-left pr-10"
            type={showPass ? 'text' : 'password'}
            value={pass}
            onChange={(e) => setPass(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowPass(!showPass)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPass ? '🙈' : '👁️'}
          </button>
        </div>

        <label className="flex items-center gap-2 mb-4 text-left cursor-pointer">
          <input
            type="checkbox"
            checked={recordarme}
            onChange={(e) => setRecordarme(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600"
          />
          <span className="text-sm text-gray-600">Recordarme</span>
        </label>

        {err && <p className="text-red-500 text-sm mb-3">{err}</p>}

        <button
          onClick={login}
          disabled={!email || !pass}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Entrar
        </button>
      </div>
    </div>
  )
}
