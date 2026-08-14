/* Main App Component - Handles routing (using react-router-dom), studio context and providers */
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { StudioProvider } from './context/StudioContext'
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

const App = () => (
  <BrowserRouter>
    <StudioProvider>
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
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </StudioProvider>
  </BrowserRouter>
)

export default App
