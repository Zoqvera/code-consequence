import { topics } from "./content";
import type { Locale } from "./i18n";

export type TopicSlug = (typeof topics)[number]["slug"];

type LocalizedText = Record<Locale, string>;

type TopicQuestion = {
  question: LocalizedText;
  answer: LocalizedText;
};

export type TopicSearchContent = {
  metaTitle: LocalizedText;
  metaDescription: LocalizedText;
  overviewTitle: LocalizedText;
  overview: Record<Locale, string[]>;
  questions: TopicQuestion[];
  concepts: Record<Locale, string[]>;
  relatedTopics: TopicSlug[];
};

export const topicSearchContent: Record<TopicSlug, TopicSearchContent> = {
  "power-democracy": {
    metaTitle: {
      en: "AI and Democracy: Power, Elections & Information",
      "pt-BR": "IA e democracia: poder, eleições e informação",
    },
    metaDescription: {
      en: "Track how AI intersects with democracy, elections, surveillance, public power and information integrity, with reporting, verified initiatives and sources.",
      "pt-BR": "Acompanhe como a IA se relaciona com democracia, eleições, vigilância, poder público e integridade da informação, com análises, iniciativas e fontes verificadas.",
    },
    overviewTitle: {
      en: "How AI intersects with democracy and political power",
      "pt-BR": "Como a IA se relaciona com democracia e poder político",
    },
    overview: {
      en: [
        "Artificial intelligence can affect democratic institutions through information systems, public administration, surveillance, political communication and automated decision-making. The effects are not uniform: they depend on who deploys a system, for what purpose, under which rules and with what forms of oversight.",
        "This hub connects reporting, verified initiatives, organizations and primary sources so readers can examine documented uses of AI and the institutional responses to them without treating technology as automatically democratic or anti-democratic.",
      ],
      "pt-BR": [
        "A inteligência artificial pode afetar instituições democráticas por meio de sistemas de informação, administração pública, vigilância, comunicação política e decisões automatizadas. Os efeitos não são uniformes: dependem de quem emprega o sistema, com qual finalidade, sob quais regras e com quais formas de fiscalização.",
        "Este hub conecta matérias, iniciativas verificadas, organizações e fontes primárias para que o leitor examine usos documentados de IA e as respostas institucionais a eles, sem tratar a tecnologia como automaticamente democrática ou antidemocrática.",
      ],
    },
    questions: [
      {
        question: {
          en: "What does AI have to do with democracy?",
          "pt-BR": "O que a IA tem a ver com democracia?",
        },
        answer: {
          en: "AI can influence how information is produced and distributed, how public agencies operate, how political communication is targeted and how surveillance or automated decisions are used. Democratic significance depends on the institutional context and the safeguards around those uses.",
          "pt-BR": "A IA pode influenciar como informações são produzidas e distribuídas, como órgãos públicos operam, como a comunicação política é direcionada e como vigilância ou decisões automatizadas são usadas. A relevância democrática depende do contexto institucional e das salvaguardas aplicadas.",
        },
      },
      {
        question: {
          en: "Can AI affect elections?",
          "pt-BR": "A IA pode afetar eleições?",
        },
        answer: {
          en: "AI may be used in campaign communication, content generation, targeting, fact-checking, election administration and cybersecurity. Its effects vary by jurisdiction and use case, so this hub focuses on documented evidence and policy responses rather than predictions about electoral outcomes.",
          "pt-BR": "A IA pode ser usada em comunicação de campanha, geração de conteúdo, segmentação, checagem de fatos, administração eleitoral e cibersegurança. Seus efeitos variam conforme a jurisdição e o uso, por isso este hub prioriza evidências documentadas e respostas institucionais, não previsões eleitorais.",
        },
      },
      {
        question: {
          en: "Why does AI governance matter for political power?",
          "pt-BR": "Por que a governança de IA importa para o poder político?",
        },
        answer: {
          en: "Governance determines who may deploy systems, what must be disclosed, how decisions can be challenged, who performs audits and what remedies exist when systems cause harm. Those rules shape the distribution of authority between governments, companies and the public.",
          "pt-BR": "A governança define quem pode empregar sistemas, o que deve ser divulgado, como decisões podem ser contestadas, quem realiza auditorias e quais formas de reparação existem quando há dano. Essas regras moldam a distribuição de autoridade entre governos, empresas e sociedade.",
        },
      },
    ],
    concepts: {
      en: ["AI and democracy", "AI elections", "AI surveillance", "AI misinformation", "political AI", "algorithmic accountability"],
      "pt-BR": ["IA e democracia", "IA nas eleições", "vigilância por IA", "desinformação e IA", "IA política", "responsabilização algorítmica"],
    },
    relatedTopics: ["governance-regulation", "rights-society"],
  },
  "work-economy": {
    metaTitle: {
      en: "AI and Jobs: Work, Automation & Economic Change",
      "pt-BR": "IA e empregos: trabalho, automação e economia",
    },
    metaDescription: {
      en: "Understand AI and jobs through automation, productivity, labour markets, ownership and inequality, with evidence, analysis and verified initiatives.",
      "pt-BR": "Entenda IA e empregos a partir de automação, produtividade, mercado de trabalho, propriedade e desigualdade, com evidências, análises e iniciativas verificadas.",
    },
    overviewTitle: {
      en: "How AI is changing work and the economy",
      "pt-BR": "Como a IA está mudando o trabalho e a economia",
    },
    overview: {
      en: [
        "The economic impact of AI is best understood at the level of tasks, occupations, firms and institutions rather than through a single prediction about employment. Some uses automate work, others augment workers, and many reorganize how decisions, expertise and productivity are distributed.",
        "This hub follows evidence about jobs, automation, productivity, wages, ownership and inequality, while connecting those changes to initiatives intended to govern or respond to them.",
      ],
      "pt-BR": [
        "O impacto econômico da IA é melhor compreendido no nível de tarefas, ocupações, empresas e instituições do que por meio de uma única previsão sobre emprego. Alguns usos automatizam trabalho, outros ampliam capacidades humanas e muitos reorganizam como decisões, conhecimento e produtividade são distribuídos.",
        "Este hub acompanha evidências sobre empregos, automação, produtividade, salários, propriedade e desigualdade, conectando essas mudanças a iniciativas criadas para governá-las ou responder a elas.",
      ],
    },
    questions: [
      {
        question: {
          en: "Will AI replace jobs?",
          "pt-BR": "A IA vai substituir empregos?",
        },
        answer: {
          en: "There is no single outcome across the labour market. AI can substitute for some tasks, complement others and create new tasks or roles. Effects differ by occupation, sector, business model, regulation and the pace at which organizations adopt the technology.",
          "pt-BR": "Não existe um único resultado para todo o mercado de trabalho. A IA pode substituir algumas tarefas, complementar outras e criar novas tarefas ou funções. Os efeitos variam por ocupação, setor, modelo de negócio, regulação e velocidade de adoção.",
        },
      },
      {
        question: {
          en: "What is AI-driven automation?",
          "pt-BR": "O que é automação impulsionada por IA?",
        },
        answer: {
          en: "AI-driven automation uses models or automated systems to perform tasks that previously required human judgment, pattern recognition, language processing or decision support. In practice, many deployments combine automation with human review rather than removing people entirely.",
          "pt-BR": "A automação impulsionada por IA usa modelos ou sistemas automatizados para executar tarefas que antes exigiam julgamento humano, reconhecimento de padrões, processamento de linguagem ou apoio à decisão. Na prática, muitas aplicações combinam automação e revisão humana.",
        },
      },
      {
        question: {
          en: "Why are ownership and productivity part of the AI debate?",
          "pt-BR": "Por que propriedade e produtividade fazem parte do debate sobre IA?",
        },
        answer: {
          en: "Productivity gains do not automatically determine who receives the economic benefits. Ownership of models, data, infrastructure and intellectual property can influence how gains and costs are distributed among firms, workers, governments and consumers.",
          "pt-BR": "Ganhos de produtividade não determinam automaticamente quem recebe os benefícios econômicos. A propriedade de modelos, dados, infraestrutura e propriedade intelectual pode influenciar como ganhos e custos são distribuídos entre empresas, trabalhadores, governos e consumidores.",
        },
      },
    ],
    concepts: {
      en: ["AI and jobs", "AI automation", "future of work", "AI productivity", "AI labour market", "AI inequality"],
      "pt-BR": ["IA e empregos", "automação por IA", "futuro do trabalho", "produtividade e IA", "mercado de trabalho e IA", "desigualdade e IA"],
    },
    relatedTopics: ["rights-society", "governance-regulation"],
  },
  "rights-society": {
    metaTitle: {
      en: "AI and Human Rights: Privacy, Bias & Society",
      "pt-BR": "IA e direitos humanos: privacidade, viés e sociedade",
    },
    metaDescription: {
      en: "Explore AI and human rights through privacy, bias, discrimination, education, culture and social impacts, with documented evidence and responses.",
      "pt-BR": "Explore IA e direitos humanos por meio de privacidade, viés, discriminação, educação, cultura e impactos sociais, com evidências e respostas documentadas.",
    },
    overviewTitle: {
      en: "How AI intersects with rights and everyday life",
      "pt-BR": "Como a IA se relaciona com direitos e vida cotidiana",
    },
    overview: {
      en: [
        "AI systems can affect rights when they process personal data, classify people, influence access to services, generate cultural material or support decisions in education, employment, policing, health and other high-impact settings.",
        "This hub examines those consequences through privacy, discrimination, accessibility, culture and human rights, while tracking institutions and initiatives that establish safeguards, remedies or alternative practices.",
      ],
      "pt-BR": [
        "Sistemas de IA podem afetar direitos quando processam dados pessoais, classificam pessoas, influenciam acesso a serviços, geram material cultural ou apoiam decisões em educação, emprego, segurança, saúde e outros contextos de alto impacto.",
        "Este hub examina essas consequências por meio de privacidade, discriminação, acessibilidade, cultura e direitos humanos, acompanhando instituições e iniciativas que estabelecem salvaguardas, reparação ou práticas alternativas.",
      ],
    },
    questions: [
      {
        question: {
          en: "How can AI affect human rights?",
          "pt-BR": "Como a IA pode afetar direitos humanos?",
        },
        answer: {
          en: "AI can affect rights through data collection, profiling, automated decisions, content moderation, surveillance and unequal system performance. The relevant rights and legal obligations depend on the context, jurisdiction and type of decision being supported.",
          "pt-BR": "A IA pode afetar direitos por meio de coleta de dados, criação de perfis, decisões automatizadas, moderação de conteúdo, vigilância e desempenho desigual dos sistemas. Os direitos e deveres jurídicos relevantes dependem do contexto, da jurisdição e do tipo de decisão apoiada.",
        },
      },
      {
        question: {
          en: "What is algorithmic bias?",
          "pt-BR": "O que é viés algorítmico?",
        },
        answer: {
          en: "Algorithmic bias describes systematic differences in how a system treats or performs for different people or groups. Bias may arise from data, labels, design choices, deployment conditions or the social processes surrounding a system.",
          "pt-BR": "Viés algorítmico descreve diferenças sistemáticas na forma como um sistema trata pessoas ou grupos, ou no desempenho que apresenta para eles. O viés pode surgir de dados, rótulos, escolhas de projeto, condições de uso ou processos sociais ao redor do sistema.",
        },
      },
      {
        question: {
          en: "Why is privacy a central AI issue?",
          "pt-BR": "Por que privacidade é uma questão central em IA?",
        },
        answer: {
          en: "Training, personalization, monitoring and automated decision systems may depend on large amounts of data. Privacy questions concern what data is collected, the legal basis for using it, how long it is retained, who can access it and whether individuals can contest or correct its use.",
          "pt-BR": "Treinamento, personalização, monitoramento e decisões automatizadas podem depender de grandes volumes de dados. As questões de privacidade envolvem quais dados são coletados, a base para seu uso, retenção, acesso e possibilidades de contestação ou correção.",
        },
      },
    ],
    concepts: {
      en: ["AI human rights", "AI privacy", "algorithmic bias", "AI discrimination", "AI and society", "responsible AI"],
      "pt-BR": ["IA e direitos humanos", "privacidade e IA", "viés algorítmico", "discriminação por IA", "IA e sociedade", "IA responsável"],
    },
    relatedTopics: ["power-democracy", "governance-regulation"],
  },
  "governance-regulation": {
    metaTitle: {
      en: "AI Governance and Regulation: Laws, Standards & Oversight",
      "pt-BR": "Governança e regulação de IA: leis, normas e fiscalização",
    },
    metaDescription: {
      en: "Follow AI governance and regulation through laws, standards, audits, institutions, accountability and public policy across jurisdictions.",
      "pt-BR": "Acompanhe governança e regulação de IA por meio de leis, normas, auditorias, instituições, responsabilização e políticas públicas em diferentes jurisdições.",
    },
    overviewTitle: {
      en: "What AI governance and regulation actually cover",
      "pt-BR": "O que governança e regulação de IA realmente abrangem",
    },
    overview: {
      en: [
        "AI governance is the broader system of rules, institutions, standards, processes and accountability mechanisms used to shape how artificial intelligence is developed and deployed. Regulation is one part of that system, alongside audits, procurement rules, technical standards, corporate controls and international coordination.",
        "This hub tracks laws, regulators, standards, public-sector policies and verified initiatives so readers can compare how different institutions define responsibilities and oversight for AI systems.",
      ],
      "pt-BR": [
        "Governança de IA é o sistema mais amplo de regras, instituições, normas, processos e mecanismos de responsabilização que orientam como a inteligência artificial é desenvolvida e empregada. Regulação é uma parte desse sistema, ao lado de auditorias, compras públicas, padrões técnicos, controles corporativos e coordenação internacional.",
        "Este hub acompanha leis, órgãos reguladores, normas, políticas públicas e iniciativas verificadas para permitir comparações entre diferentes formas de definir responsabilidades e fiscalização de sistemas de IA.",
      ],
    },
    questions: [
      {
        question: {
          en: "What is AI governance?",
          "pt-BR": "O que é governança de IA?",
        },
        answer: {
          en: "AI governance is the set of institutions, rules and practices used to direct, evaluate and constrain the development or use of AI. It can include legislation, standards, risk management, audits, transparency requirements, procurement rules and internal organizational controls.",
          "pt-BR": "Governança de IA é o conjunto de instituições, regras e práticas usadas para orientar, avaliar e limitar o desenvolvimento ou uso de IA. Pode incluir legislação, normas, gestão de riscos, auditorias, transparência, regras de contratação e controles organizacionais.",
        },
      },
      {
        question: {
          en: "What is the difference between AI governance and AI regulation?",
          "pt-BR": "Qual é a diferença entre governança e regulação de IA?",
        },
        answer: {
          en: "AI regulation generally refers to legally binding rules created or enforced by public authorities. AI governance is broader and also includes voluntary standards, technical controls, organizational policies, independent evaluation and other mechanisms that may exist alongside formal law.",
          "pt-BR": "Regulação de IA geralmente se refere a regras juridicamente obrigatórias criadas ou aplicadas por autoridades públicas. Governança de IA é mais ampla e também inclui normas voluntárias, controles técnicos, políticas organizacionais, avaliação independente e outros mecanismos além da lei formal.",
        },
      },
      {
        question: {
          en: "How can AI systems be held accountable?",
          "pt-BR": "Como sistemas de IA podem ser responsabilizados?",
        },
        answer: {
          en: "Accountability can involve documentation, impact assessments, audits, incident reporting, appeal mechanisms, regulator powers, legal liability and requirements placed on developers or deployers. The applicable mechanism depends on the system, sector and jurisdiction.",
          "pt-BR": "A responsabilização pode envolver documentação, avaliações de impacto, auditorias, notificação de incidentes, mecanismos de recurso, poderes regulatórios, responsabilidade jurídica e deveres impostos a desenvolvedores ou operadores. O mecanismo aplicável depende do sistema, setor e jurisdição.",
        },
      },
    ],
    concepts: {
      en: ["AI governance", "AI regulation", "AI policy", "AI law", "AI audit", "algorithmic accountability"],
      "pt-BR": ["governança de IA", "regulação de IA", "políticas de IA", "legislação de IA", "auditoria de IA", "responsabilização algorítmica"],
    },
    relatedTopics: ["power-democracy", "rights-society", "science-technology"],
  },
  "infrastructure-planet": {
    metaTitle: {
      en: "Environmental Impact of AI: Energy, Water & Data Centers",
      "pt-BR": "Impacto ambiental da IA: energia, água e data centers",
    },
    metaDescription: {
      en: "Understand the environmental impact of AI through energy, water, data centers, chips, minerals, emissions and e-waste, with evidence and policy responses.",
      "pt-BR": "Entenda o impacto ambiental da IA por meio de energia, água, data centers, chips, minerais, emissões e lixo eletrônico, com evidências e respostas públicas.",
    },
    overviewTitle: {
      en: "What makes AI an environmental and infrastructure issue",
      "pt-BR": "Por que a IA é também uma questão ambiental e de infraestrutura",
    },
    overview: {
      en: [
        "AI depends on physical infrastructure: data centers, electricity grids, cooling systems, chips, mineral supply chains and telecommunications networks. Environmental impacts therefore extend beyond model software to the resources required to build, power and replace computing infrastructure.",
        "This hub follows energy and water use, data-center expansion, semiconductor supply chains, emissions, mineral extraction and electronic waste, together with policies and initiatives that measure or respond to those impacts.",
      ],
      "pt-BR": [
        "A IA depende de infraestrutura física: data centers, redes elétricas, sistemas de resfriamento, chips, cadeias minerais e telecomunicações. Seus impactos ambientais, portanto, vão além do software e incluem os recursos necessários para construir, alimentar e substituir infraestrutura computacional.",
        "Este hub acompanha uso de energia e água, expansão de data centers, cadeias de semicondutores, emissões, extração mineral e lixo eletrônico, além de políticas e iniciativas que medem ou respondem a esses impactos.",
      ],
    },
    questions: [
      {
        question: {
          en: "Why does AI use so much energy?",
          "pt-BR": "Por que a IA usa tanta energia?",
        },
        answer: {
          en: "Training and running AI models requires computation performed by specialized hardware in data centers. Energy use varies widely by model, workload, hardware efficiency, utilization, location and the electricity mix serving the infrastructure.",
          "pt-BR": "Treinar e executar modelos de IA exige processamento em hardware especializado dentro de data centers. O consumo varia muito conforme modelo, carga de trabalho, eficiência do hardware, utilização, localização e matriz elétrica da infraestrutura.",
        },
      },
      {
        question: {
          en: "Why does AI use water?",
          "pt-BR": "Por que a IA usa água?",
        },
        answer: {
          en: "Some data centers use water directly or indirectly for cooling, while electricity generation can also involve water use. The amount depends on cooling technology, climate, facility design and the local energy system.",
          "pt-BR": "Alguns data centers usam água direta ou indiretamente para resfriamento, e a geração de eletricidade também pode envolver consumo hídrico. A quantidade depende da tecnologia de resfriamento, clima, projeto da instalação e sistema energético local.",
        },
      },
      {
        question: {
          en: "What is the environmental footprint of AI?",
          "pt-BR": "O que é a pegada ambiental da IA?",
        },
        answer: {
          en: "The environmental footprint of AI includes operational energy and water, embodied impacts from manufacturing hardware, mineral extraction, construction, emissions and electronic waste. A complete assessment therefore considers both ongoing use and the infrastructure life cycle.",
          "pt-BR": "A pegada ambiental da IA inclui energia e água durante a operação, impactos incorporados na fabricação de hardware, extração mineral, construção, emissões e lixo eletrônico. Uma avaliação completa considera tanto o uso contínuo quanto o ciclo de vida da infraestrutura.",
        },
      },
    ],
    concepts: {
      en: ["environmental impact of AI", "AI energy use", "AI water use", "AI data centers", "AI carbon footprint", "AI e-waste"],
      "pt-BR": ["impacto ambiental da IA", "consumo de energia da IA", "consumo de água da IA", "data centers de IA", "pegada de carbono da IA", "lixo eletrônico e IA"],
    },
    relatedTopics: ["science-technology", "governance-regulation"],
  },
  "science-technology": {
    metaTitle: {
      en: "AI Safety and Research: Models, Capabilities & Technical Change",
      "pt-BR": "Segurança e pesquisa em IA: modelos, capacidades e mudança técnica",
    },
    metaDescription: {
      en: "Follow AI safety, model capabilities, evaluations, research infrastructure and technical change where they create public consequences.",
      "pt-BR": "Acompanhe segurança de IA, capacidades de modelos, avaliações, infraestrutura de pesquisa e mudança técnica quando produzem consequências públicas.",
    },
    overviewTitle: {
      en: "When technical AI research becomes a public issue",
      "pt-BR": "Quando a pesquisa técnica em IA se torna uma questão pública",
    },
    overview: {
      en: [
        "Changes in model capabilities, autonomy, reliability, security and evaluation can create consequences beyond the laboratory. Technical progress matters to this observatory when it changes what systems can do, how confidently institutions can deploy them or what forms of oversight become necessary.",
        "This hub connects AI research and safety with public consequences, including evaluation methods, model behavior, computing infrastructure, security and the institutions that test or govern advanced systems.",
      ],
      "pt-BR": [
        "Mudanças nas capacidades, autonomia, confiabilidade, segurança e avaliação de modelos podem produzir consequências além do laboratório. O progresso técnico importa para este observatório quando altera o que sistemas conseguem fazer, a confiança com que instituições podem empregá-los ou as formas de fiscalização necessárias.",
        "Este hub conecta pesquisa e segurança de IA a consequências públicas, incluindo métodos de avaliação, comportamento de modelos, infraestrutura computacional, segurança e instituições que testam ou governam sistemas avançados.",
      ],
    },
    questions: [
      {
        question: {
          en: "What is AI safety?",
          "pt-BR": "O que é segurança de IA?",
        },
        answer: {
          en: "AI safety is a broad field concerned with identifying, evaluating and reducing risks created by AI systems. Depending on the context, it can include reliability, robustness, security, harmful capabilities, human oversight, misuse prevention and alignment between system behavior and intended goals.",
          "pt-BR": "Segurança de IA é um campo amplo dedicado a identificar, avaliar e reduzir riscos criados por sistemas de IA. Conforme o contexto, pode incluir confiabilidade, robustez, segurança, capacidades perigosas, supervisão humana, prevenção de uso indevido e alinhamento entre comportamento e objetivos pretendidos.",
        },
      },
      {
        question: {
          en: "What are AI model capabilities?",
          "pt-BR": "O que são capacidades de modelos de IA?",
        },
        answer: {
          en: "Model capabilities are the tasks and behaviors an AI system can perform under defined conditions. Capability claims are usually assessed through evaluations, benchmarks, real-world testing or controlled experiments, each of which has limitations.",
          "pt-BR": "Capacidades de modelos são as tarefas e comportamentos que um sistema de IA consegue executar sob condições definidas. Essas capacidades costumam ser avaliadas por testes, benchmarks, uso em situações reais ou experimentos controlados, todos com limitações.",
        },
      },
      {
        question: {
          en: "Why do AI evaluations matter?",
          "pt-BR": "Por que avaliações de IA importam?",
        },
        answer: {
          en: "Evaluations provide evidence about performance, reliability, safety and failure modes before or during deployment. They do not guarantee how a system will behave in every real-world setting, but they can make technical claims more testable and oversight more evidence-based.",
          "pt-BR": "Avaliações fornecem evidências sobre desempenho, confiabilidade, segurança e modos de falha antes ou durante o uso. Elas não garantem como um sistema se comportará em todos os contextos reais, mas tornam afirmações técnicas mais testáveis e a fiscalização mais baseada em evidências.",
        },
      },
    ],
    concepts: {
      en: ["AI safety", "AI model capabilities", "AI evaluations", "AI research", "AI security", "frontier AI"],
      "pt-BR": ["segurança de IA", "capacidades de modelos de IA", "avaliações de IA", "pesquisa em IA", "segurança de sistemas de IA", "IA de fronteira"],
    },
    relatedTopics: ["governance-regulation", "infrastructure-planet"],
  },
};

export function getTopicSearchContent(slug: TopicSlug) {
  return topicSearchContent[slug];
}
