import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'

export default function Layout() {
  return (
    <>
      <Sidebar />
      <main className="main">
        <Outlet />
      </main>
    </>
  )
}
