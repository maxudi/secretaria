-- ============================================================================
-- MIGRATION 002: SEED DA LOJA ALPHA E ÔMEGA Nº 3402, QUADRO, DIRETORIA E FRASES
-- ============================================================================

DO $$
DECLARE
  v_loja_id UUID := '00000000-0000-0000-0000-000000003402';
BEGIN
  -- 1. Inserir a Loja Maçônica Alpha e Ômega Nº 3402
  INSERT INTO public.lojas (
    id,
    slug,
    invocacao,
    nome_loja,
    numero_loja,
    potencia_jurisdicao,
    reunioes_dia_hora,
    rito_potencia,
    endereco_templo,
    oriente_cidade_uf,
    uf,
    email_loja,
    gestao_atual,
    ultimo_numero_balaustre,
    ativo
  ) VALUES (
    v_loja_id,
    'alpha-e-omega-3402',
    'À Gl∴ do Supr∴ Arq∴ do Univ∴',
    'LOJA MAÇÔNICA ALPHA E ÔMEGA',
    '3402',
    'Jurisdicionada ao GRANDE ORIENTE DO BRASIL',
    'Reuniões às terças-feiras – 20:00 horas',
    'RITO BRASILEIRO',
    'Rua do Fazendeiro, 680',
    'Uberlândia-MG',
    'MG',
    'alphaeomega@cmt.org.br',
    '2025-2027',
    124,
    TRUE
  )
  ON CONFLICT (slug) DO UPDATE SET
    nome_loja = EXCLUDED.nome_loja,
    numero_loja = EXCLUDED.numero_loja,
    potencia_jurisdicao = EXCLUDED.potencia_jurisdicao,
    reunioes_dia_hora = EXCLUDED.reunioes_dia_hora,
    rito_potencia = EXCLUDED.rito_potencia,
    endereco_templo = EXCLUDED.endereco_templo,
    oriente_cidade_uf = EXCLUDED.oriente_cidade_uf,
    email_loja = EXCLUDED.email_loja,
    gestao_atual = EXCLUDED.gestao_atual;

  -- 2. Inserir os 30 Irmãos do Quadro da Loja Alpha e Ômega Nº 3402
  INSERT INTO public.irmaos_quadro (loja_id, nome_exibicao, nome_civil, grau, situacao)
  VALUES
    (v_loja_id, 'Ir∴ ALDO BORGES DE FREITAS', 'ALDO BORGES DE FREITAS', 'mestre', 'regular'),
    (v_loja_id, 'Ir∴ ALEXSANDER FARIA DO VAL OLIVEIRA', 'ALEXSANDER FARIA DO VAL OLIVEIRA', 'mestre', 'regular'),
    (v_loja_id, 'Ir∴ ANDERSON CARDOSO COSTA', 'ANDERSON CARDOSO COSTA', 'mestre', 'regular'),
    (v_loja_id, 'Ir∴ ANDRE LUIZ BORGES', 'ANDRE LUIZ BORGES', 'mestre', 'regular'),
    (v_loja_id, 'Ir∴ AROLDO BOLÍVAR DE ALVARENGA', 'AROLDO BOLÍVAR DE ALVARENGA', 'mestre', 'regular'),
    (v_loja_id, 'Ir∴ ARTUR IASCO PEREIRA', 'ARTUR IASCO PEREIRA', 'mestre', 'regular'),
    (v_loja_id, 'Ir∴ CARLOS ALBERTO BATISTA', 'CARLOS ALBERTO BATISTA', 'mestre', 'regular'),
    (v_loja_id, 'Ir∴ CLEUBER MARCELO PASCOA', 'CLEUBER MARCELO PASCOA', 'mestre', 'regular'),
    (v_loja_id, 'Ir∴ DOMICIO FERREIRA NEVES', 'DOMICIO FERREIRA NEVES', 'mestre', 'regular'),
    (v_loja_id, 'Ir∴ EMERSON LUIZ TEIXEIRA', 'EMERSON LUIZ TEIXEIRA', 'mestre', 'regular'),
    (v_loja_id, 'Ir∴ FERNANDO MAGNO ROCHA', 'FERNANDO MAGNO ROCHA', 'mestre', 'regular'),
    (v_loja_id, 'Ir∴ HENRIQUE ROSALEN', 'HENRIQUE ROSALEN', 'mestre', 'regular'),
    (v_loja_id, 'Ir∴ ISAIAS FERREIRA DOS SANTOS', 'ISAIAS FERREIRA DOS SANTOS', 'mestre', 'regular'),
    (v_loja_id, 'Ir∴ JEFFERSON BATISTA DE PAULA SILVA', 'JEFFERSON BATISTA DE PAULA SILVA', 'mestre', 'regular'),
    (v_loja_id, 'Ir∴ JOAO CAIRO DE PAULA', 'JOAO CAIRO DE PAULA', 'mestre', 'regular'),
    (v_loja_id, 'Ir∴ JOSE MARTINS JUNIOR', 'JOSE MARTINS JUNIOR', 'mestre', 'regular'),
    (v_loja_id, 'Ir∴ JOSE RUBENS BUIATTI', 'JOSE RUBENS BUIATTI', 'mestre', 'regular'),
    (v_loja_id, 'Ir∴ LEANDRO ZANATTA CARCANHOLO', 'LEANDRO ZANATTA CARCANHOLO', 'mestre', 'regular'),
    (v_loja_id, 'Ir∴ LEMUEL DELFINO ALVES', 'LEMUEL DELFINO ALVES', 'mestre', 'regular'),
    (v_loja_id, 'Ir∴ LINDOMAR APARECIDO FURNIEL DE OLIVEIRA', 'LINDOMAR APARECIDO FURNIEL DE OLIVEIRA', 'mestre', 'regular'),
    (v_loja_id, 'Ir∴ LUIZ LUCIANO GARCIA', 'LUIZ LUCIANO GARCIA', 'mestre', 'regular'),
    (v_loja_id, 'Ir∴ LUIZ FERNANDO MARRA DE AQUINO', 'LUIZ FERNANDO MARRA DE AQUINO', 'mestre', 'regular'),
    (v_loja_id, 'Ir∴ MARCIO PATRICIO GONÇALVES DA SILVEIRA', 'MARCIO PATRICIO GONÇALVES DA SILVEIRA', 'mestre', 'regular'),
    (v_loja_id, 'Ir∴ MARCOS FERREIRA VASCONCELOS', 'MARCOS FERREIRA VASCONCELOS', 'mestre', 'regular'),
    (v_loja_id, 'Ir∴ MAX FERREIRA DA SILVA', 'MAX FERREIRA DA SILVA', 'mestre', 'regular'),
    (v_loja_id, 'Ir∴ MAXIMIANO EDUARDO PEREIRA', 'MAXIMIANO EDUARDO PEREIRA', 'mestre', 'regular'),
    (v_loja_id, 'Ir∴ OTANES BARCELOS OLIVEIRA NETO', 'OTANES BARCELOS OLIVEIRA NETO', 'mestre', 'regular'),
    (v_loja_id, 'Ir∴ PAULO HENRIQUE CUNHA', 'PAULO HENRIQUE CUNHA', 'mestre', 'regular'),
    (v_loja_id, 'Ir∴ RAPHAEL CARVALHO CARDOSO', 'RAPHAEL CARVALHO CARDOSO', 'mestre', 'regular'),
    (v_loja_id, 'Ir∴ SÉRGIO ANTÔNIO ABRAÃO FREITAS', 'SÉRGIO ANTÔNIO ABRAÃO FREITAS', 'mestre', 'regular')
  ON CONFLICT (loja_id, nome_exibicao) DO NOTHING;

  -- 3. Inserir a Diretoria Titular da Gestão 2025-2027
  INSERT INTO public.gestoes_diretoria (
    loja_id,
    periodo_gestao,
    ativa,
    veneravel_mestre_nome,
    primeiro_vigilante_nome,
    segundo_vigilante_nome,
    orador_nome,
    secretario_nome,
    tesoureiro_nome,
    chanceler_nome,
    mestre_cerimonias_nome,
    hospitaleiro_nome,
    cobridor_interno_nome
  ) VALUES (
    v_loja_id,
    '2025-2027',
    TRUE,
    'Ir∴ MARCOS FERREIRA VASCONCELOS',
    'Ir∴ PAULO HENRIQUE CUNHA',
    'Ir∴ ISAIAS FERREIRA DOS SANTOS',
    'Ir∴ EMERSON LUIZ TEIXEIRA',
    'Ir∴ MAXIMIANO EDUARDO PEREIRA',
    'Ir∴ MAX FERREIRA DA SILVA',
    'Ir∴ FERNANDO MAGNO ROCHA',
    'Ir∴ ANDERSON CARDOSO COSTA',
    'Ir∴ HENRIQUE ROSALEN',
    'Ir∴ ANDRE LUIZ BORGES'
  )
  ON CONFLICT (loja_id, periodo_gestao) DO UPDATE SET
    veneravel_mestre_nome = EXCLUDED.veneravel_mestre_nome,
    primeiro_vigilante_nome = EXCLUDED.primeiro_vigilante_nome,
    segundo_vigilante_nome = EXCLUDED.segundo_vigilante_nome,
    orador_nome = EXCLUDED.orador_nome,
    secretario_nome = EXCLUDED.secretario_nome,
    tesoureiro_nome = EXCLUDED.tesoureiro_nome,
    chanceler_nome = EXCLUDED.chanceler_nome,
    mestre_cerimonias_nome = EXCLUDED.mestre_cerimonias_nome,
    hospitaleiro_nome = EXCLUDED.hospitaleiro_nome,
    cobridor_interno_nome = EXCLUDED.cobridor_interno_nome;
END $$;

-- 4. Inserir as Frases Padrão Globais do Sistema (Item 8 — Palavra a Bem Geral e da Ordem)
INSERT INTO public.frases_padrao_item8 (
  loja_id, codigo_slug, titulo, palavra_chave, categoria, cargo, texto_modelo, campos_variaveis, ordem, ativo, personalizavel
) VALUES
  (NULL, 'frase-chanceler-visitas-padrao', 'Chanceler: Certificados de visitas', 'Chanceler, visitas, certificados de visitas, oficinas', 'Chanceler', 'Chanceler', 'Anunciou os certificados de visitas dos IIr∴ do Quadro a outras Of∴.', '{}', 1, TRUE, TRUE),
  (NULL, 'frase-chanceler-aniversariantes-datas-palmas', 'Chanceler: Aniversariantes e datas comemorativas (Bateria de palmas)', 'Chanceler, aniversariantes, datas comemorativas, bateria de palmas', 'Chanceler', 'Chanceler', 'Por fim anunciou os aniversariantes e as datas comemorativas, solicitando bateria de palmas.', '{}', 2, TRUE, TRUE),
  (NULL, 'frase-tesoureiro-tronco-bons-fluidos', 'Tesoureiro: Tronco colheu bons fluidos e medalha cunhada', 'Tesoureiro, tronco, bons fluidos, medalha cunhada, valor, reais', 'Tesoureiro', 'Tesoureiro', 'Por fim informou que o tronco colheu além de bons fluidos a medalha cunhada de {VALOR_TRONCO}.', '{}', 3, TRUE, TRUE),
  (NULL, 'frase-tfa-vm', 'T∴F∴A∴ do Venerável Mestre', 'TFA, T∴F∴A∴, abraço, venerável, loja', 'Transmissão de TFA', NULL, 'Transmitiu à Loja um Tríplice e Fraternal Abraço (T∴F∴A∴) em nome do Ven∴ M∴ e dos Obreiros da {LOJA}.', '{LOJA}', 4, TRUE, TRUE),
  (NULL, 'frase-tfa-simples', 'Transmissão de T∴F∴A∴ de Irmão', 'TFA, T∴F∴A∴, abraço fraterno, irmão', 'Transmissão de TFA', NULL, 'Deixou um Tríplice e Fraternal Abraço (T∴F∴A∴) a todos os IIr∴ presentes em nome do {IRMAO}.', '{IRMAO}', 5, TRUE, TRUE),
  (NULL, 'frase-elogio-sessao', 'Elogio à condução da sessão', 'Elogio à sessão, condução, harmonia, trabalhos', 'Saudações e cumprimentos', NULL, 'Elogiou a condução da sessão, a harmonia reinante entre as CCol∴ e a excelente organização dos trabalhos.', '{}', 6, TRUE, TRUE),
  (NULL, 'frase-visitante-agradecimento', 'Agradecimento de Ir∴ Visitante pela acolhida', 'Visitante, acolhida, hospitalidade, recepção', 'Irmãos visitantes', NULL, 'Agradeceu a calorosa e fraterna acolhida recebida dos IIr∴ desta Of∴, colocando sua A∴R∴L∴S∴ mãe à disposição.', '{}', 7, TRUE, TRUE),
  (NULL, 'frase-boas-vindas-visitantes', 'Boas-vindas aos IIr∴ Visitantes', 'Boas-vindas, saudação, visitantes', 'Agradecimentos e hospitalidade', NULL, 'Saudou fraternalmente os IIr∴ visitantes presentes, agradecendo por abrilhantarem as CCol∴ da Of∴ nesta sessão.', '{}', 8, TRUE, TRUE),
  (NULL, 'frase-convite-visita', 'Convite para sessão em outra A∴R∴L∴S∴', 'Convite para visita, sessão magna, outra loja', 'Convites para outras Lojas', NULL, 'Formulou convite aos IIr∴ para participarem da sessão na {LOJA}, que será realizada no dia {DATA}.', '{LOJA,DATA}', 9, TRUE, TRUE),
  (NULL, 'frase-comentario-trabalho', 'Parabenização pelo Trabalho / Instrução', 'Comentário sobre o trabalho, peça de arquitetura, instrução', 'Comentários sobre trabalhos apresentados', NULL, 'Parabenizou o {IRMAO} pela brilhante apresentação da Peça de Arquitetura da noite, tecendo considerações complementares sobre o tema.', '{IRMAO}', 10, TRUE, TRUE),
  (NULL, 'frase-manifestacao-favoravel', 'Concordância e apoio à matéria', 'Favorável, apoio, concordância', 'Manifestações favoráveis', NULL, 'Manifestou-se de forma inteiramente favorável às proposições apresentadas, ressaltando sua importância para o fortalecimento da Of∴.', '{}', 11, TRUE, TRUE),
  (NULL, 'frase-opiniao-contraria', 'Opinião contrária / divergente', 'Opinião contrária, divergência, ressalva', 'Manifestações contrárias ou parcialmente contrárias', NULL, 'Apresentou entendimento divergente sobre determinado aspecto do assunto abordado, expondo suas considerações com respeito e fraternidade.', '{}', 12, TRUE, TRUE),
  (NULL, 'frase-justificativa-ausencia', 'Justificativa de ausência em sessão anterior', 'Justificativa de ausência, falta, sessão anterior', 'Justificativas de ausências e atrasos', NULL, 'Justificou sua ausência em sessão anterior por motivos profissionais e particulares pertinentes.', '{}', 13, TRUE, TRUE),
  (NULL, 'frase-justificativa-terceiro', 'Justificativa de ausência de outro Ir∴', 'Justificativa de ausência de irmão, escusas', 'Justificativas de ausências e atrasos', NULL, 'Apresentou justificativa de ausência em nome do {IRMAO}, impossibilitado de comparecer aos trabalhos desta noite.', '{IRMAO}', 14, TRUE, TRUE),
  (NULL, 'frase-congratulacoes', 'Congratulações e felicitações a Ir∴', 'Parabéns, congratulações, homenagem', 'Agradecimentos e congratulações', NULL, 'Dirigiu votos de congratulações ao {IRMAO}, destacando sua dedicação e exemplo maçônico.', '{IRMAO}', 15, TRUE, TRUE),
  (NULL, 'frase-solidariedade-saude', 'Informações sobre saúde de Ir∴ ou familiar', 'Solidariedade, saúde, hospitalaria, visita fraterna', 'Solidariedade e assuntos pessoais', 'Hospitaleiro', 'Trouxe notícias sobre o estado de saúde do {IRMAO}, solicitando vibrações positivas ao G∴A∴D∴U∴ de todos os IIr∴ para sua pronta recuperação.', '{IRMAO}', 16, TRUE, TRUE),
  (NULL, 'frase-comunicado-evento', 'Comunicado sobre evento ou confraternização', 'Evento, ágape, confraternização, comunicado', 'Comunicados e eventos', NULL, 'Comunicou aos IIr∴ os detalhes referentes ao evento "{EVENTO}", convidando a família maçônica a participar.', '{EVENTO}', 17, TRUE, TRUE),
  (NULL, 'frase-consideracao-pessoal', 'Reflexão filosófica e consideração pessoal', 'Reflexão, experiência pessoal, filosofia', 'Considerações pessoais', NULL, 'Compartilhou uma reflexão pessoal acerca dos ensinamentos morais da Maçonaria e sua aplicação na vida cotidiana.', '{}', 18, TRUE, TRUE),
  (NULL, 'frase-orador-legalidade', 'Orador: Ratificação de Legalidade dos Trabalhos', 'Orador, guarda da lei, legalidade, justo e perfeito', 'Outros Oficiais', 'Orador', 'Por fim, o Ir∴ Orador ratificou que os trabalhos transcorreram de forma justa e perfeita, em estrita observância às Leis e Regulamentos que regem a Ordem Maçônica.', '{}', 19, TRUE, TRUE),
  (NULL, 'frase-secretario-comunicado', 'Secretário: Comunicação Administrativa da Secretaria', 'Secretário, pranchas, administração, secretaria', 'Outros Oficiais', 'Secretário', 'Informou que a pasta da Secretaria encontra-se em dia e colocou a Secretaria à disposição dos IIr∴ do Quadro.', '{}', 20, TRUE, TRUE),
  (NULL, 'frase-vm-encerramento', 'Ven∴ M∴: Agradecimento e Encerramento', 'Venerável Mestre, encerramento, agradecimento final', 'Encerramento das manifestações', 'Venerável Mestre', 'Agradeceu a presença e a dedicação dos IIr∴ do Quadro e Visitantes, convidando a todos para o ágape fraternal após o encerramento ritualístico.', '{}', 21, TRUE, TRUE);

