import { Header } from './components/layout/Header'
import { Footer } from './components/layout/Footer'
import { HomePage } from './pages/HomePage'

function App() {
  return (
    <>
      <a
        href="#main"
        className="fixed left-4 top-0 z-[100] -translate-y-full rounded-b-lg bg-primary px-4 py-2 text-sm font-medium text-surface no-underline shadow-md transition-transform focus:translate-y-0"
      >
        Skip to main content
      </a>
      <Header />
      <main id="main" className="flex-1">
        <HomePage />
      </main>
      <Footer />
    </>
  )
}

export default App
