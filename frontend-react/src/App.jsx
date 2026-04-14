import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Tasks from './pages/Tasks'
import TaskDetail from './pages/TaskDetail'
import CreateTask from './pages/CreateTask'
import Fabrics from './pages/Fabrics'
import FabricDetail from './pages/FabricDetail'
import Quotes from './pages/Quotes'
import QuoteDetail from './pages/QuoteDetail'
import Orders from './pages/Orders'
import OrderDetail from './pages/OrderDetail'
import Production from './pages/Production'
import Profile from './pages/Profile'

// Защищенный роут
const PrivateRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore()
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      <Route path="/" element={
        <PrivateRoute>
          <Layout />
        </PrivateRoute>
      }>
        <Route index element={<Dashboard />} />
        
        {/* Лиды и задачи */}
        <Route path="tasks" element={<Tasks />} />
        <Route path="tasks/new" element={<CreateTask />} />
        <Route path="tasks/:id" element={<TaskDetail />} />
        
        {/* Склад */}
        <Route path="fabrics" element={<Fabrics />} />
        <Route path="fabrics/:id" element={<FabricDetail />} />
        
        {/* Сметы */}
        <Route path="quotes" element={<Quotes />} />
        <Route path="quotes/:id" element={<QuoteDetail />} />
        
        {/* Заказы */}
        <Route path="orders" element={<Orders />} />
        <Route path="orders/:id" element={<OrderDetail />} />
        
        {/* Производство */}
        <Route path="production" element={<Production />} />
        
        {/* Профиль */}
        <Route path="profile" element={<Profile />} />
      </Route>
    </Routes>
  )
}

export default App
