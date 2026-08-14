/* Main App Component - Handles routing (using react-router-dom), studio context and providers */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { StudioProvider } from './context/StudioContext'
import { PlatformProvider } from './context/PlatformContext'
import Layout from './components/Layout'

// Pages
import Index from './pages/Index'
import Projetos from './pages/Projetos'
import Gravadora from './pages/Gravadora'
import EditorVideo from './pages/EditorVideo'
import Carrossel from './pages/Carrossel'
import PostEstatico from './pages/PostEstatico'
import Teleprompter from './pages/Teleprompter'
import Agendamento from './pages/Agendamento'
import NotFound from './pages/NotFound'
// Plataforma de Marketing e Vendas com IA
import Posicionamento from './pages/Posicionamento'
import Conteudo from './pages/Conteudo'
import Funis from './pages/Funis'
import Ativos from './pages/Ativos'
import Escala from './pages/Escala'
import Vendas from './pages/Vendas'
import Biblioteca from './pages/Biblioteca'
import Metricas from './pages/Metricas'
import Configuracoes from './pages/Configuracoes'
import Assessoria from './pages/Assessoria'
import VersaoMobile from './pages/VersaoMobile'
import Academy from './pages/Academy'

const App = () => (
  <BrowserRouter>
    <StudioProvider>
      <PlatformProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner position="bottom-right" theme="dark" richColors />
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Index />} />
              <Route path="/projetos" element={<Projetos />} />
              <Route path="/gravadora" element={<Gravadora />} />
              <Route path="/editor/:id" element={<EditorVideo />} />
              <Route path="/carrossel" element={<Carrossel />} />
              <Route path="/post" element={<PostEstatico />} />
              <Route path="/teleprompter" element={<Teleprompter />} />
              <Route path="/agendamento" element={<Agendamento />} />
              {/* Plataforma de Marketing e Vendas com IA */}
              <Route path="/modulo-1" element={<Posicionamento />} />
              <Route path="/posicionamento" element={<Posicionamento />} />
              <Route path="/modulo-2" element={<Conteudo />} />
              <Route path="/modulo-3" element={<Navigate to="/funis" replace />} />
              <Route path="/funis" element={<Funis />} />
              <Route path="/modulo-4" element={<Ativos />} />
              <Route path="/modulo-5" element={<Escala />} />
              <Route path="/modulo-6" element={<Vendas />} />
              <Route path="/biblioteca" element={<Biblioteca />} />
              <Route path="/metricas" element={<Metricas />} />
              <Route path="/configuracoes" element={<Configuracoes />} />
              <Route path="/assessoria" element={<Assessoria />} />
              <Route path="/versao-mobile" element={<VersaoMobile />} />
              <Route path="/academy" element={<Academy />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </PlatformProvider>
    </StudioProvider>
  </BrowserRouter>
)

export default App
