window.AIBIO = window.AIBIO || {};
window.AIBIO.researchAreas = [
  { name: 'AI Paleontology', slug: 'ai-paleontology', desc: 'Fossil interpretation, extinct organism reconstruction, macroevolutionary patterns, and quantitative paleobiology.' },
  { name: 'AI Ecology', slug: 'ai-ecology', desc: 'Ecosystem dynamics, species interactions, niche models, disturbance, and ecological forecasting.' },
  { name: 'AI Evolutionary Biology', slug: 'ai-evolutionary-biology', desc: 'Selection, adaptation, speciation, phylogenetic inference, evolvability, and evolutionary theory.' },
  { name: 'AI Immunology', slug: 'ai-immunology', desc: 'Immune networks, host response models, antigen recognition, inflammation, and mucosal immunity theory.' },
  { name: 'AI Genomics and Molecular Evolution', slug: 'ai-genomics-molecular-evolution', desc: 'Comparative genomics, molecular evolution, genome architecture, sequence-space modeling, and variant interpretation.' },
  { name: 'AI Systems Biology', slug: 'ai-systems-biology', desc: 'Regulatory networks, pathway logic, cell-state transitions, multi-omics integration, and dynamical biological systems.' },
  { name: 'AI Developmental Biology', slug: 'ai-developmental-biology', desc: 'Pattern formation, morphogenesis, gene regulatory programs, developmental constraint, and body-plan evolution.' },
  { name: 'AI Neuroscience', slug: 'ai-neuroscience', desc: 'Neural circuits, behavior, cognition, neuroevolution, and computational models of nervous systems.' },
  { name: 'AI Microbiology', slug: 'ai-microbiology', desc: 'Microbial physiology, microbial communities, pathogen ecology, resistance, and host-microbe systems.' },
  { name: 'AI Structural Biology', slug: 'ai-structural-biology', desc: 'Protein structure, conformational landscapes, molecular interaction models, and structural function inference.' },
  { name: 'AI Cell Biology', slug: 'ai-cell-biology', desc: 'Organelle dynamics, intracellular transport, cell morphology, cell-cycle models, and cellular mechanisms.' },
  { name: 'AI Synthetic Biology', slug: 'ai-synthetic-biology', desc: 'Biological circuit design, engineered systems, biosynthetic logic, and model-guided biological construction.' },
  { name: 'AI Epidemiology and Disease Ecology', slug: 'ai-epidemiology-disease-ecology', desc: 'Transmission models, pathogen evolution, outbreak dynamics, zoonotic systems, and population-level disease theory.' },
  { name: 'AI Biological Ideas and Product Concepts', slug: 'ai-biological-ideas-product-concepts', desc: 'AI-generated or human-generated biological research ideas, scientific product concepts, software concepts, and educational biology tool ideas.' },
  { name: 'Other', slug: 'other', desc: 'AI-assisted theoretical biology submissions that do not fit the listed research areas.' }
];
window.AIBIO.areaNameBySlug = Object.fromEntries(window.AIBIO.researchAreas.map(a => [a.slug, a.name]));
window.AIBIO.areaSlugByName = Object.fromEntries(window.AIBIO.researchAreas.map(a => [a.name, a.slug]));
window.AIBIO.manuscripts = [
  {
    id:'AIBioTrXiv-2026-0001',submissionCategory:'AI Research',slug:'aibiotrxiv-2026-0001',title:'Example article: article page template',
    authors:'The Sound of Evolution',topic:'AI Evolutionary Biology',date:'2026-06-01',version:'v1',
    abstract:'This example article is a template record showing how an AIBioTrXiv article page will display metadata, abstract text, section navigation, figures, citation information, rights information, peer comments, and PDF access. It is not a research claim.',
    keywords:['example article','template','AIBioTrXiv','manuscript format'],pdf:'/assets/papers/example-article.pdf'
  }
];
window.AIBIO.sampleSections = [
  {heading:'Abstract',text:'This pilot article demonstrates the public manuscript format used by AIBioTrXiv. It combines a formal article header, citation information, section-linked navigation, figure placement, and rights information in a reader-friendly layout.',legend:'Figure 1. Conceptual relationship among AI assistance, human responsibility, and biological theory.',image:'/assets/img/Brand.jpg?v=38'},
  {heading:'Introduction',text:'AI-assisted theoretical biology needs a publication format that remains readable, citable, and accountable. AIBioTrXiv treats manuscripts as public scholarly records while clearly separating editorial screening from peer review.',legend:'',image:''},
  {heading:'Results',text:'The proposed archive format uses structured metadata, transparent AI-use statements, versioned public pages, and downloadable PDF files. These features make each manuscript easier to inspect, cite, correct, and revise.',legend:'Figure 2. A simplified workflow from submission to public posting.',image:'/assets/img/Brand.jpg?v=38'},
  {heading:'Materials and Methods',text:'The demonstration page is assembled from structured manuscript sections. Each section can contain text, figures, and legends where appropriate, allowing the same submitted material to support both a web article and a PDF layout.',legend:'',image:''},
  {heading:'References',text:'1. AIBioTrXiv pilot documentation. 2026.\n2. The Sound of Evolution. AI BioTheory Archive concept notes. 2026.',legend:'',image:''}
];
