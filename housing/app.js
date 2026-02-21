// --- API Configuration ---

const API_HOST = 'realty-in-us.p.rapidapi.com';
const API_BASE = `https://${API_HOST}`;

function getApiKey() {
  return localStorage.getItem('rapidapi_key') || '';
}

function apiHeaders() {
  return {
    'x-rapidapi-host': API_HOST,
    'x-rapidapi-key': getApiKey(),
  };
}

// --- API Calls ---

async function fetchForSale(postalCode) {
  const url = `${API_BASE}/properties/v3/list`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      ...apiHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      limit: 20,
      offset: 0,
      postal_code: postalCode,
      status: ['for_sale'],
      sort: { direction: 'desc', field: 'list_date' },
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`API error ${resp.status}: ${text.slice(0, 200)}`);
  }
  return resp.json();
}

async function fetchSoldHomes(postalCode) {
  const url = `${API_BASE}/properties/v3/list`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      ...apiHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      limit: 42,
      offset: 0,
      postal_code: postalCode,
      status: ['sold'],
      sort: { direction: 'desc', field: 'sold_date' },
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`API error ${resp.status}: ${text.slice(0, 200)}`);
  }
  return resp.json();
}

// --- Normalization ---

function normalizeProperty(raw) {
  const desc = raw.description || {};
  const loc = raw.location?.address || {};
  const photo = raw.primary_photo?.href || raw.photos?.[0]?.href || '';

  return {
    id: raw.property_id,
    price: raw.list_price ?? raw.description?.sold_price ?? null,
    soldPrice: raw.description?.sold_price ?? raw.last_sold_price ?? null,
    address: [loc.line, loc.city, loc.state_code, loc.postal_code].filter(Boolean).join(', '),
    addressShort: loc.line || 'Unknown',
    city: loc.city || '',
    beds: desc.beds ?? null,
    baths: desc.baths ?? null,
    sqft: desc.sqft ?? null,
    lotSqft: desc.lot_sqft ?? null,
    type: desc.type || raw.prop_type || '',
    photo: photo ? photo.replace('s.jpg', 'od-w480_h360.jpg') : '',
    soldDate: raw.description?.sold_date || raw.last_sold_date || null,
    listDate: raw.list_date || null,
  };
}

// --- Comparable Sale Analysis ---

function findComps(listing, soldHomes) {
  if (!listing.sqft) return { comps: [], estimate: null };

  const sqftLow = listing.sqft * 0.7;
  const sqftHigh = listing.sqft * 1.3;

  // Filter sold homes to comparable size
  const candidates = soldHomes.filter(s =>
    s.sqft &&
    s.soldPrice &&
    s.sqft >= sqftLow &&
    s.sqft <= sqftHigh
  );

  if (candidates.length === 0) return { comps: [], estimate: null };

  // Sort by sqft similarity (closest match first)
  candidates.sort((a, b) =>
    Math.abs(a.sqft - listing.sqft) - Math.abs(b.sqft - listing.sqft)
  );

  // Take top 5 comps
  const comps = candidates.slice(0, 5);

  // Weighted average $/sqft: weight by inverse sqft difference (closer = heavier)
  let totalWeight = 0;
  let weightedPricePerSqft = 0;

  for (const comp of comps) {
    const sqftDiff = Math.abs(comp.sqft - listing.sqft);
    const weight = 1 / (1 + sqftDiff / listing.sqft);
    const pricePerSqft = comp.soldPrice / comp.sqft;
    weightedPricePerSqft += pricePerSqft * weight;
    totalWeight += weight;
  }

  const avgPricePerSqft = weightedPricePerSqft / totalWeight;
  const estimate = Math.round(avgPricePerSqft * listing.sqft);

  return { comps, estimate, avgPricePerSqft };
}

// --- Formatting ---

function fmtPrice(n) {
  if (n == null) return '—';
  return '$' + n.toLocaleString('en-US');
}

function fmtSqft(n) {
  if (n == null) return '—';
  return n.toLocaleString('en-US') + ' sqft';
}

function fmtPricePerSqft(n) {
  if (n == null) return '—';
  return '$' + Math.round(n).toLocaleString('en-US') + '/sqft';
}

// --- DOM ---

const apiSetup = document.getElementById('api-setup');
const apiKeyInput = document.getElementById('api-key-input');
const saveKeyBtn = document.getElementById('save-key-btn');
const app = document.getElementById('app');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const changeKeyBtn = document.getElementById('change-key-btn');
const loadingEl = document.getElementById('loading');
const errorEl = document.getElementById('error');
const resultsEl = document.getElementById('results');
const resultsTitle = document.getElementById('results-title');
const marketSummary = document.getElementById('market-summary');
const listingsGrid = document.getElementById('listings-grid');

// Check for saved key
if (getApiKey()) {
  apiSetup.classList.add('hidden');
  app.classList.remove('hidden');
} else {
  apiSetup.classList.remove('hidden');
}

saveKeyBtn.addEventListener('click', () => {
  const key = apiKeyInput.value.trim();
  if (!key) return;
  localStorage.setItem('rapidapi_key', key);
  apiSetup.classList.add('hidden');
  app.classList.remove('hidden');
});

changeKeyBtn.addEventListener('click', () => {
  app.classList.add('hidden');
  apiSetup.classList.remove('hidden');
  apiKeyInput.value = getApiKey();
});

searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') doSearch();
});
searchBtn.addEventListener('click', doSearch);

async function doSearch() {
  const query = searchInput.value.trim();
  if (!query) return;

  loadingEl.classList.remove('hidden');
  errorEl.classList.add('hidden');
  resultsEl.classList.add('hidden');

  try {
    // Fetch active listings and sold homes in parallel
    const [forSaleRes, soldRes] = await Promise.all([
      fetchForSale(query),
      fetchSoldHomes(query),
    ]);

    const forSaleRaw = forSaleRes.data?.home_search?.results || [];
    const soldRaw = soldRes.data?.home_search?.results || [];

    if (forSaleRaw.length === 0 && soldRaw.length === 0) {
      throw new Error('No properties found for this ZIP code. Try another one.');
    }

    const forSale = forSaleRaw.map(normalizeProperty);
    const sold = soldRaw.map(normalizeProperty);

    renderResults(query, forSale, sold);
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove('hidden');
  } finally {
    loadingEl.classList.add('hidden');
  }
}

function renderResults(zip, forSale, sold) {
  resultsTitle.textContent = `Properties in ${zip}`;

  // Market summary stats
  const soldWithPrice = sold.filter(s => s.soldPrice && s.sqft);
  const avgPricePerSqft = soldWithPrice.length > 0
    ? soldWithPrice.reduce((sum, s) => sum + s.soldPrice / s.sqft, 0) / soldWithPrice.length
    : null;

  const medianSoldPrice = soldWithPrice.length > 0
    ? median(soldWithPrice.map(s => s.soldPrice))
    : null;

  marketSummary.innerHTML = `
    <div class="stat">
      <div class="stat-value">${forSale.length}</div>
      <div class="stat-label">Active listings</div>
    </div>
    <div class="stat">
      <div class="stat-value">${sold.length}</div>
      <div class="stat-label">Recent sales</div>
    </div>
    ${medianSoldPrice ? `
    <div class="stat">
      <div class="stat-value">${fmtPrice(medianSoldPrice)}</div>
      <div class="stat-label">Median sold price</div>
    </div>` : ''}
    ${avgPricePerSqft ? `
    <div class="stat">
      <div class="stat-value">${fmtPricePerSqft(avgPricePerSqft)}</div>
      <div class="stat-label">Avg sold $/sqft</div>
    </div>` : ''}
  `;

  // Render listing cards
  listingsGrid.innerHTML = '';

  if (forSale.length === 0) {
    listingsGrid.innerHTML = '<p style="color:#666">No active listings found. Showing market data from recent sales only.</p>';
  }

  forSale.forEach(listing => {
    const { comps, estimate, avgPricePerSqft: compPps } = findComps(listing, sold);
    const card = createListingCard(listing, estimate, comps, compPps);
    listingsGrid.appendChild(card);
  });

  resultsEl.classList.remove('hidden');
}

function createListingCard(listing, estimate, comps, compPps) {
  const card = document.createElement('div');
  card.className = 'listing-card';

  let estimateHtml = '';
  if (estimate && listing.price) {
    const diff = estimate - listing.price;
    const pct = ((diff / listing.price) * 100).toFixed(1);
    let cls = 'fair';
    let label = 'Fair price';
    if (pct < -5) { cls = 'above'; label = 'Possibly overpriced'; }
    else if (pct > 5) { cls = 'below'; label = 'Possibly underpriced'; }

    estimateHtml = `
      <div class="estimate-section">
        <div class="estimate-row">
          <span class="estimate-label">Comp Estimate</span>
          <span class="estimate-value ${cls}">${fmtPrice(estimate)}</span>
        </div>
        <div class="estimate-detail">
          ${label} &middot; ${fmtPricePerSqft(compPps)} from ${comps.length} comp${comps.length !== 1 ? 's' : ''}
        </div>
        <button class="comps-toggle" data-id="${listing.id}">Show comps</button>
        <div class="comps-list hidden" id="comps-${listing.id}">
          ${comps.map(c => `
            <div class="comp-item">
              <span>${c.addressShort}</span>
              <span>${fmtPrice(c.soldPrice)} &middot; ${fmtSqft(c.sqft)}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } else if (!listing.sqft) {
    estimateHtml = '<div class="no-estimate">No sqft data — cannot estimate</div>';
  } else if (comps.length === 0) {
    estimateHtml = '<div class="no-estimate">No comparable sales found</div>';
  }

  card.innerHTML = `
    ${listing.photo ? `<img class="listing-photo" src="${listing.photo}" alt="Property photo" loading="lazy">` : '<div class="listing-photo"></div>'}
    <div class="listing-body">
      <div class="listing-price">${fmtPrice(listing.price)}</div>
      <div class="listing-address">${listing.address}</div>
      <div class="listing-details">
        ${listing.beds != null ? `<span>${listing.beds} bd</span>` : ''}
        ${listing.baths != null ? `<span>${listing.baths} ba</span>` : ''}
        ${listing.sqft ? `<span>${fmtSqft(listing.sqft)}</span>` : ''}
        ${listing.type ? `<span>${listing.type.replace(/_/g, ' ')}</span>` : ''}
      </div>
      ${estimateHtml}
    </div>
  `;

  // Toggle comps visibility
  const toggleBtn = card.querySelector('.comps-toggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const list = card.querySelector(`#comps-${listing.id}`);
      list.classList.toggle('hidden');
      toggleBtn.textContent = list.classList.contains('hidden') ? 'Show comps' : 'Hide comps';
    });
  }

  return card;
}

function median(arr) {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
