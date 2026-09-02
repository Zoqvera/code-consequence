INSERT INTO topics (slug) VALUES ('power-democracy') ON CONFLICT (slug) DO NOTHING;
INSERT INTO topics (slug) VALUES ('work-economy') ON CONFLICT (slug) DO NOTHING;
INSERT INTO topics (slug) VALUES ('rights-society') ON CONFLICT (slug) DO NOTHING;
INSERT INTO topics (slug) VALUES ('governance-regulation') ON CONFLICT (slug) DO NOTHING;
INSERT INTO topics (slug) VALUES ('infrastructure-planet') ON CONFLICT (slug) DO NOTHING;
INSERT INTO topics (slug) VALUES ('science-technology') ON CONFLICT (slug) DO NOTHING;

INSERT INTO topic_translations (topic_id, locale, name, description)
SELECT id, 'en', 'Power & Democracy', 'How AI reshapes political power, democratic institutions, elections, public authority and accountability.' FROM topics WHERE slug = 'power-democracy'
ON CONFLICT (topic_id, locale) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;
INSERT INTO topic_translations (topic_id, locale, name, description)
SELECT id, 'pt-BR', 'Poder & Democracia', 'Como a IA transforma poder político, instituições democráticas, eleições, autoridade pública e responsabilização.' FROM topics WHERE slug = 'power-democracy'
ON CONFLICT (topic_id, locale) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO topic_translations (topic_id, locale, name, description)
SELECT id, 'en', 'Work & Economy', 'Labour, employment, markets, productivity, concentration of economic power and distributional effects of AI.' FROM topics WHERE slug = 'work-economy'
ON CONFLICT (topic_id, locale) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;
INSERT INTO topic_translations (topic_id, locale, name, description)
SELECT id, 'pt-BR', 'Trabalho & Economia', 'Trabalho, emprego, mercados, produtividade, concentração de poder econômico e efeitos distributivos da IA.' FROM topics WHERE slug = 'work-economy'
ON CONFLICT (topic_id, locale) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO topic_translations (topic_id, locale, name, description)
SELECT id, 'en', 'Rights & Society', 'Human rights, privacy, surveillance, discrimination, education, culture and social consequences of AI.' FROM topics WHERE slug = 'rights-society'
ON CONFLICT (topic_id, locale) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;
INSERT INTO topic_translations (topic_id, locale, name, description)
SELECT id, 'pt-BR', 'Direitos & Sociedade', 'Direitos humanos, privacidade, vigilância, discriminação, educação, cultura e consequências sociais da IA.' FROM topics WHERE slug = 'rights-society'
ON CONFLICT (topic_id, locale) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO topic_translations (topic_id, locale, name, description)
SELECT id, 'en', 'Governance & Regulation', 'Laws, standards, institutions, oversight mechanisms and public-policy responses governing AI.' FROM topics WHERE slug = 'governance-regulation'
ON CONFLICT (topic_id, locale) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;
INSERT INTO topic_translations (topic_id, locale, name, description)
SELECT id, 'pt-BR', 'Governança & Regulação', 'Leis, padrões, instituições, mecanismos de supervisão e respostas de política pública para governar a IA.' FROM topics WHERE slug = 'governance-regulation'
ON CONFLICT (topic_id, locale) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO topic_translations (topic_id, locale, name, description)
SELECT id, 'en', 'Infrastructure & Planet', 'Data centres, energy, water, minerals, emissions, e-waste and the material infrastructure behind AI.' FROM topics WHERE slug = 'infrastructure-planet'
ON CONFLICT (topic_id, locale) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;
INSERT INTO topic_translations (topic_id, locale, name, description)
SELECT id, 'pt-BR', 'Infraestrutura & Planeta', 'Data centers, energia, água, minerais, emissões, lixo eletrônico e a infraestrutura material por trás da IA.' FROM topics WHERE slug = 'infrastructure-planet'
ON CONFLICT (topic_id, locale) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO topic_translations (topic_id, locale, name, description)
SELECT id, 'en', 'Science & Technology', 'Research, technical systems, evaluation, infrastructure and scientific developments shaping AI.' FROM topics WHERE slug = 'science-technology'
ON CONFLICT (topic_id, locale) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;
INSERT INTO topic_translations (topic_id, locale, name, description)
SELECT id, 'pt-BR', 'Ciência & Tecnologia', 'Pesquisa, sistemas técnicos, avaliação, infraestrutura e desenvolvimentos científicos que moldam a IA.' FROM topics WHERE slug = 'science-technology'
ON CONFLICT (topic_id, locale) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;
