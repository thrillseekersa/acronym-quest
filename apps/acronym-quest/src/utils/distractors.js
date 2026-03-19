// Generate plausible wrong breakdown options that match the acronym's letter pattern
// For "HD" → generates things like "Horizontal Display", "Hardware Definition", etc.

const WORD_BANK = {
  A: ['Advanced', 'Automated', 'Applied', 'Adaptive', 'Analytical', 'Aggregate', 'Academic', 'Active', 'Accelerated', 'Associative'],
  B: ['Basic', 'Binary', 'Behavioral', 'Broadband', 'Balanced', 'Baseline', 'Biological', 'Business', 'Bridge', 'Block'],
  C: ['Central', 'Computed', 'Certified', 'Clinical', 'Continuous', 'Comprehensive', 'Collaborative', 'Combined', 'Critical', 'Common'],
  D: ['Digital', 'Dynamic', 'Distributed', 'Direct', 'Diagnostic', 'Developmental', 'Dedicated', 'Differential', 'Data', 'Defined'],
  E: ['Electronic', 'Enhanced', 'Environmental', 'Educational', 'Enterprise', 'Effective', 'Experimental', 'Executive', 'Embedded', 'Evaluative'],
  F: ['Functional', 'Federal', 'Flexible', 'Fundamental', 'Financial', 'Formative', 'Formal', 'Focused', 'Fixed', 'Field'],
  G: ['General', 'Global', 'Graphic', 'Guided', 'Geographic', 'Genetic', 'Graduated', 'Governance', 'Grid', 'Ground'],
  H: ['High', 'Human', 'Hybrid', 'Hierarchical', 'Holistic', 'Horizontal', 'Hardware', 'Historical', 'Health', 'Harmonic'],
  I: ['Integrated', 'International', 'Intelligent', 'Interactive', 'Institutional', 'Industrial', 'Incremental', 'Indexed', 'Implicit', 'Internal'],
  J: ['Joint', 'Judicial', 'Justified', 'Junior', 'Jurisdictional', 'Just-In-Time', 'Job-Based', 'Judgmental', 'Journaled', 'Juvenile'],
  K: ['Key', 'Knowledge', 'Kinetic', 'Kernel', 'Known', 'Kinesthetic', 'Keystone', 'Kept', 'Keynote', 'Kit'],
  L: ['Local', 'Linear', 'Logical', 'Learning', 'Layered', 'Licensed', 'Limited', 'Longitudinal', 'Linked', 'Linguistic'],
  M: ['Multi', 'Managed', 'Modular', 'Medical', 'Measured', 'Mobile', 'Mechanical', 'Molecular', 'Monitored', 'Master'],
  N: ['National', 'Network', 'Numerical', 'Natural', 'Navigational', 'Normalized', 'Neural', 'Nested', 'Nominal', 'Non-Linear'],
  O: ['Operational', 'Optimized', 'Organizational', 'Open', 'Objective', 'Observed', 'Ordered', 'Oriented', 'Original', 'Output'],
  P: ['Professional', 'Programmed', 'Progressive', 'Protected', 'Predictive', 'Parallel', 'Practical', 'Preliminary', 'Primary', 'Public'],
  Q: ['Quality', 'Quantitative', 'Qualified', 'Quarterly', 'Quick', 'Quantum', 'Queued', 'Quotient', 'Quasi', 'Query'],
  R: ['Regional', 'Responsive', 'Regulated', 'Recursive', 'Relative', 'Rapid', 'Resident', 'Robust', 'Remote', 'Research'],
  S: ['Systematic', 'Standard', 'Secure', 'Strategic', 'Structured', 'Sequential', 'Specialized', 'Statistical', 'Scaled', 'Simulated'],
  T: ['Technical', 'Targeted', 'Temporal', 'Theoretical', 'Tactical', 'Transparent', 'Terminal', 'Threshold', 'Total', 'Tracked'],
  U: ['Universal', 'Unified', 'User', 'Underlying', 'Utility', 'Updated', 'Upstream', 'Upper', 'Unstructured', 'Unit'],
  V: ['Virtual', 'Variable', 'Validated', 'Visual', 'Vertical', 'Voluntary', 'Vector', 'Verified', 'Vocational', 'Value'],
  W: ['Wireless', 'Weighted', 'Wide', 'Workplace', 'Written', 'Workflow', 'Web-Based', 'Whole', 'Working', 'Wired'],
  X: ['Extended', 'External', 'Exchange', 'Executable', 'Experimental', 'Express', 'Extra', 'Exploratory', 'Extensive', 'Expandable'],
  Y: ['Yearly', 'Yield', 'Youth', 'Year-End', 'Yielding', 'Year-Round', 'Young', 'Yearlong', 'Yesterday', 'Yes-No'],
  Z: ['Zero', 'Zone', 'Zonal', 'Zenith', 'Zigzag', 'Zero-Based', 'Zoomed', 'Zoned', 'Zippered', 'Zero-Sum']
};

const NOUNS = {
  A: ['Analysis', 'Architecture', 'Assessment', 'Application', 'Allocation', 'Algorithm', 'Administration', 'Acquisition', 'Audit', 'Array'],
  B: ['Base', 'Board', 'Buffer', 'Branch', 'Benchmark', 'Broadcasting', 'Bundle', 'Boundary', 'Bandwidth', 'Bridging'],
  C: ['Control', 'Configuration', 'Computing', 'Coordination', 'Classification', 'Compliance', 'Calibration', 'Circuitry', 'Conversion', 'Coding'],
  D: ['Design', 'Development', 'Distribution', 'Diagnostics', 'Documentation', 'Database', 'Deployment', 'Detection', 'Delivery', 'Display'],
  E: ['Engineering', 'Evaluation', 'Exchange', 'Execution', 'Environment', 'Estimation', 'Equipment', 'Extraction', 'Education', 'Encoding'],
  F: ['Framework', 'Formatting', 'Frequency', 'Function', 'Facilitation', 'Filtering', 'Forensics', 'Forecasting', 'Fusion', 'Feedback'],
  G: ['Gateway', 'Generation', 'Governance', 'Graphics', 'Grouping', 'Grading', 'Guidance', 'Grid', 'Genome', 'Growth'],
  H: ['Hub', 'Hardware', 'Hosting', 'Handling', 'Hierarchy', 'Harmonization', 'Heuristics', 'Health', 'Hypothesis', 'Hashing'],
  I: ['Integration', 'Interface', 'Infrastructure', 'Instrumentation', 'Indexing', 'Inspection', 'Implementation', 'Intelligence', 'Iteration', 'Imaging'],
  J: ['Justification', 'Junction', 'Journaling', 'Jobs', 'Judiciary', 'Joining', 'Jurisdictions', 'Judgment', 'Jamming', 'Jitter'],
  K: ['Kernel', 'Knowledge', 'Keeping', 'Keying', 'Kinetics', 'Kit', 'Keystroke', 'Kiosk', 'Knowledgebase', 'Kilowatt'],
  L: ['Language', 'Logic', 'Linking', 'Logging', 'Layer', 'Layout', 'Licensing', 'Loading', 'Lookup', 'Learning'],
  M: ['Management', 'Modeling', 'Monitoring', 'Mapping', 'Methodology', 'Measurement', 'Module', 'Mechanism', 'Markup', 'Migration'],
  N: ['Network', 'Navigation', 'Notation', 'Normalization', 'Node', 'Numerics', 'Nesting', 'Naming', 'Negotiation', 'Nucleus'],
  O: ['Operations', 'Optimization', 'Ordering', 'Output', 'Orchestration', 'Organization', 'Overlay', 'Observation', 'Offset', 'Object'],
  P: ['Processing', 'Protocol', 'Platform', 'Programming', 'Provisioning', 'Profiling', 'Projection', 'Printing', 'Partitioning', 'Planning'],
  Q: ['Querying', 'Quantification', 'Qualification', 'Queue', 'Quotation', 'Quality', 'Quantum', 'Quorum', 'Quicksort', 'Quadrant'],
  R: ['Routing', 'Recovery', 'Reporting', 'Resolution', 'Rendering', 'Registry', 'Retrieval', 'Regulation', 'Replication', 'Resources'],
  S: ['System', 'Services', 'Synthesis', 'Simulation', 'Security', 'Specification', 'Scheduling', 'Storage', 'Signaling', 'Scaling'],
  T: ['Technology', 'Testing', 'Transformation', 'Tracking', 'Transfer', 'Topology', 'Throughput', 'Translation', 'Training', 'Tuning'],
  U: ['Unit', 'Utilization', 'Updating', 'Upload', 'Unification', 'Usage', 'Undertaking', 'Understanding', 'Utility', 'Uplink'],
  V: ['Validation', 'Verification', 'Visualization', 'Vectorization', 'Versioning', 'Virtualization', 'Vocabulary', 'Volume', 'Variability', 'Viewport'],
  W: ['Workflow', 'Warehousing', 'Wiring', 'Writing', 'Weighting', 'Webbing', 'Wavelength', 'Wrapping', 'Windowing', 'Workload'],
  X: ['Exchange', 'Extension', 'Execution', 'Extraction', 'Exploration', 'Expression', 'Export', 'Expansion', 'Expenditure', 'Experimentation'],
  Y: ['Yielding', 'Year', 'Youth', 'Yearbook', 'Year-End', 'Yardstick', 'Yield', 'Yearlong', 'Yesterday', 'Yes-No'],
  Z: ['Zoning', 'Zeroing', 'Zooming', 'Zone', 'Zenith', 'Zigzag', 'Zip', 'Zero-Point', 'Zapping', 'Zettabyte']
};

// Get the letters from an acronym
function getAcronymLetters(acronym) {
  return acronym.toUpperCase().split('').filter(c => /[A-Z]/.test(c));
}

// Pick a random item from an array
function randPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Generate a single fake breakdown matching the letter pattern
function generateFakeBreakdown(letters, existingBreakdowns) {
  const maxAttempts = 20;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const parts = letters.map((letter, idx) => {
      const isLast = idx === letters.length - 1;
      const pool = isLast ? NOUNS[letter] || WORD_BANK[letter] : WORD_BANK[letter];
      if (!pool || pool.length === 0) return letter;
      return randPick(pool);
    });
    const fake = parts.join(' ');
    if (!existingBreakdowns.has(fake.toLowerCase())) {
      return fake;
    }
  }
  // Fallback: just use whatever we got
  return letters.map(l => randPick(WORD_BANK[l] || [l])).join(' ');
}

/**
 * Generate 3 plausible wrong breakdowns for an acronym
 * @param {string} acronym - e.g. "HD"
 * @param {string} correctBreakdown - e.g. "High Definition"
 * @param {string[]} otherRealBreakdowns - breakdowns from other acronyms to avoid duplicating
 * @returns {string[]} - 3 fake breakdowns that follow the letter pattern
 */
export function generateDistractors(acronym, correctBreakdown, otherRealBreakdowns = []) {
  const letters = getAcronymLetters(acronym);
  if (letters.length === 0) return ['Option A', 'Option B', 'Option C'];

  const existing = new Set([
    correctBreakdown.toLowerCase(),
    ...otherRealBreakdowns.map(b => b.toLowerCase())
  ]);

  const distractors = [];
  for (let i = 0; i < 3; i++) {
    const fake = generateFakeBreakdown(letters, existing);
    existing.add(fake.toLowerCase());
    distractors.push(fake);
  }

  return distractors;
}
