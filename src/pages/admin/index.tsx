import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui/card'
import { Button } from '../../shared/ui/button'
import { History, FileText, Users, List, Activity } from 'lucide-react'

export default function AdminDashboardPage() {
  const navigate = useNavigate()
  return (
    <div className="pt-16 px-4 max-w-6xl mx-auto" data-page="admin-panel">
      <div className="mb-2 pt-2">
        <button
          onClick={() => navigate('/')}
          className="nav-back-btn inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border transition-colors"
        >← Volver</button>
      </div>
      <div className="mb-6 mt-3">
        <h1 className="text-2xl font-bold">Panel de administrador</h1>
        <p className="mt-1">Accesos rápidos a históricos y utilidades. Ejecutar diagnósticos es opcional.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Históricos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><History size={18}/> Histórico general</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 mb-4">Ver todas las ejecuciones del dashboard con scores, fechas y usuarios.</p>
            <Link to="/admin/history" state={{ from: '/admin' }}>
              <Button variant="outline" className="w-full">Abrir histórico</Button>
            </Link>
          </CardContent>
        </Card>

        {/* Ejecutar diagnóstico */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileText size={18}/> Ejecutar diagnóstico</CardTitle>
          </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 mb-4">Opcional: acceder al formulario para correr diagnósticos.</p>
              <Link to="/" state={{ from: '/admin' }}>
                <Button variant="outline" className="w-full">Abrir formulario</Button>
              </Link>
            </CardContent>
        </Card>

        {/* Usuarios */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users size={18}/> Usuarios</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 mb-4">Listado y gestión de usuarios.</p>
            <Link to="/admin/users" state={{ from: '/admin' }}>
              <Button variant="outline" className="w-full">Abrir usuarios</Button>
            </Link>
          </CardContent>
        </Card>

        {/* Trazabilidad */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><List size={18}/> Modo Trazabilidad</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 mb-4">Cambios de rol, eliminaciones y sus fechas.</p>
            <Link to="/admin/logs" state={{ from: '/admin' }}>
              <Button variant="outline" className="w-full">Abrir trazabilidad</Button>
            </Link>
          </CardContent>
        </Card>

        {/* Telemetría */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Activity size={18}/> Telemetría</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 mb-4">Visitas y uso de vistas para QA.</p>
            <Link to="/admin/telemetry" state={{ from: '/admin' }}>
              <Button className="w-full" variant="outline">Ver telemetría</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
