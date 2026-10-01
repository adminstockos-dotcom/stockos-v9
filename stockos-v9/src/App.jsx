import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import SuperAdmin from './pages/SuperAdmin'
import EmpresaLayout from './layouts/EmpresaLayout'
import EmpresaDashboard from './pages/EmpresaDashboard'
import InfraEmpresa from './pages/empresa/InfraEmpresa'
import PersonasRoles from './pages/empresa/PersonasRoles'
import EscanerABC from './pages/empresa/EscanerABC'
import CampanasIA from './pages/empresa/CampanasIA'
import HistorialGanadoras from './pages/empresa/HistorialGanadoras'
import CatalogoPublico from './pages/empresa/CatalogoPublico'
import DisparoLink from './pages/empresa/DisparoLink'
import DespachosCRM from './pages/empresa/DespachosCRM'
import BodegaStock from './pages/empresa/BodegaStock'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/superadmin" element={<SuperAdmin />} />
        <Route path="/empresa/:subdomain" element={<EmpresaDashboard />} />
        <Route path="/empresa/:subdomain/historial" element={<HistorialGanadoras />} />
        <Route path="/inv/:subdomain" element={<EmpresaDashboard />} />
        <Route path="/infra/:subdomain" element={<EmpresaDashboard />} />
        <Route path="/dashboard" element={<EmpresaLayout />}>
          <Route index element={<InfraEmpresa />} />
          <Route path="tab-0" element={<InfraEmpresa />} />
          <Route path="tab-1" element={<PersonasRoles />} />
          <Route path="tab-2" element={<EscanerABC />} />
          <Route path="tab-3" element={<CatalogoPublico />} />
          <Route path="tab-4" element={<CampanasIA />} />
          <Route path="tab-5" element={<DisparoLink />} />
          <Route path="tab-6" element={<DespachosCRM />} />
          <Route path="tab-7" element={<BodegaStock />} />
        </Route>

        {/* BLINDAJE: rutas comodín - nunca 404 */}
        <Route path="/empresa/:empresaId/*" element={<EmpresaDashboard />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
export default App
