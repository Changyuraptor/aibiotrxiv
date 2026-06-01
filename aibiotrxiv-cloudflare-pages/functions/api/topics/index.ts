export async function onRequestGet() {
  return Response.json({ ok: true, topics: [
    { name: 'AI Paleontology', slug: 'ai-paleontology' },
    { name: 'AI Ecology', slug: 'ai-ecology' },
    { name: 'AI Evolutionary Biology', slug: 'ai-evolutionary-biology' },
    { name: 'AI Immunology', slug: 'ai-immunology' },
    { name: 'AI Genomics and Molecular Evolution', slug: 'ai-genomics-molecular-evolution' },
    { name: 'AI Systems Biology', slug: 'ai-systems-biology' },
    { name: 'AI Developmental Biology', slug: 'ai-developmental-biology' },
    { name: 'AI Neuroscience', slug: 'ai-neuroscience' },
    { name: 'AI Microbiology', slug: 'ai-microbiology' },
    { name: 'AI Structural Biology', slug: 'ai-structural-biology' },
    { name: 'AI Cell Biology', slug: 'ai-cell-biology' },
    { name: 'AI Synthetic Biology', slug: 'ai-synthetic-biology' },
    { name: 'AI Epidemiology and Disease Ecology', slug: 'ai-epidemiology-disease-ecology' },
    { name: 'AI Biological Ideas and Product Concepts', slug: 'ai-biological-ideas-product-concepts' },
    { name: 'Other', slug: 'other' }
  ]});
}
