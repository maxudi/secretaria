import React, { useState } from 'react';
import { BalaustreForm } from './components/BalaustreForm';
import { TelaLoginCim } from './components/TelaLoginCim';
import {
  carregarSessaoUsuarioLogado,
  limparSessaoUsuarioLogado,
  SessaoUsuarioLogado,
} from './types/balaustre';

export function App() {
  const [sessaoLogada, setSessaoLogada] = useState<SessaoUsuarioLogado | null>(
    () => carregarSessaoUsuarioLogado()
  );

  const handleLogout = () => {
    limparSessaoUsuarioLogado();
    setSessaoLogada(null);
  };

  if (!sessaoLogada) {
    return (
      <TelaLoginCim
        onLoginSuccess={(novaSessao) => setSessaoLogada(novaSessao)}
      />
    );
  }

  return (
    <BalaustreForm
      ultimoBalaustreNumero={141}
      sessaoLogada={sessaoLogada}
      onLogout={handleLogout}
    />
  );
}

export default App;
