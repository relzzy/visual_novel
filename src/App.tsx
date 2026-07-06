import OrientationGuard from './components/OrientationGuard';
import VisualNovelEngine from './components/VisualNovelEngine';

export default function App() {
  return (
    <OrientationGuard>
      <VisualNovelEngine />
    </OrientationGuard>
  );
}
