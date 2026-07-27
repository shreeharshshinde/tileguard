import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';
import type { Inspector } from '../create-inspector.js';
import {
  createInspectorStore,
  type InspectorStore,
} from '../store/inspector-store.js';

interface InspectorContextValue {
  readonly inspector: Inspector | null;
  readonly store: InspectorStore;
  readonly setInspector: (inspector: Inspector) => void;
}

const InspectorContext = createContext<InspectorContextValue | null>(null);

export function InspectorProvider({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  const [store] = useState(() => createInspectorStore());
  const [inspector, setInspector] = useState<Inspector | null>(null);

  useEffect(() => () => store.dispose(), [store]);

  return (
    <InspectorContext.Provider value={{ inspector, store, setInspector }}>
      {children}
    </InspectorContext.Provider>
  );
}

export function useInspectorContext(): InspectorContextValue {
  const value = useContext(InspectorContext);
  if (value === null)
    throw new Error(
      'useInspectorContext must be used within an InspectorProvider.',
    );
  return value;
}
