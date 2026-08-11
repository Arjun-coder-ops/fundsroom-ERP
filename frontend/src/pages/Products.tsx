import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, extractErrorMessage } from '../api/client';
import { PaginationMeta, Product } from '../types';
import Banner from '../components/Banner';
import { useAuth } from '../auth/AuthContext';

const emptyForm = {
  name: '',
  sku: '',
  category: '',
  unitPrice: '',
  currentStock: '0',
  minStockAlert: '0',
  location: '',
};

export default function Products() {
  const { user } = useAuth();
  const canManage = user?.role === 'ADMIN' || user?.role === 'WAREHOUSE';

  const [products, setProducts] = useState<Product[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    api
      .get('/products', { params: { page, search: search || undefined, lowStock: lowStockOnly || undefined } })
      .then((res) => {
        setProducts(res.data.data);
        setMeta(res.data.meta);
      })
      .catch((err) => setError(extractErrorMessage(err)))
      .finally(() => setLoading(false));
  }

  useEffect(load, [page, lowStockOnly]);

  function handleSearchSubmit(e: FormEvent) {
    e.preventDefault();
    setPage(1);
    load();
  }

  function openCreate() {
    setEditingProduct(null);
    setForm(emptyForm);
    setFormError('');
    setShowForm(true);
  }

  function openEdit(p: Product) {
    setEditingProduct(p);
    setForm({
      name: p.name,
      sku: p.sku,
      category: p.category || '',
      unitPrice: String(p.unitPrice),
      currentStock: String(p.currentStock),
      minStockAlert: String(p.minStockAlert),
      location: p.location || '',
    });
    setFormError('');
    setShowForm(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    const payload = {
      name: form.name,
      sku: form.sku,
      category: form.category || undefined,
      unitPrice: Number(form.unitPrice),
      currentStock: Number(form.currentStock),
      minStockAlert: Number(form.minStockAlert),
      location: form.location || undefined,
    };
    try {
      if (editingProduct) {
        await api.put(`/products/${editingProduct.id}`, payload);
      } else {
        await api.post('/products', payload);
      }
      setShowForm(false);
      setPage(1);
      load();
    } catch (err) {
      setFormError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Products</h1>
          <p className="page-subtitle">Product catalog and pricing</p>
        </div>
        {canManage && (
          <button className="btn" onClick={openCreate}>
            + Add product
          </button>
        )}
      </div>

      <form className="toolbar" onSubmit={handleSearchSubmit}>
        <input
          style={{ maxWidth: 260 }}
          placeholder="Search name or SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="btn btn-secondary" type="submit">
          Search
        </button>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          <input
            type="checkbox"
            style={{ width: 'auto' }}
            checked={lowStockOnly}
            onChange={(e) => {
              setLowStockOnly(e.target.checked);
              setPage(1);
            }}
          />
          Low stock only
        </label>
      </form>

      <Banner type="error" message={error} />

      <div className="card">
        {loading ? (
          <div className="loading-state">Loading products...</div>
        ) : products.length === 0 ? (
          <div className="empty-state">No products found.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Unit Price</th>
                <th>Stock</th>
                <th>Location</th>
                {canManage && <th></th>}
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link to={`/inventory?productId=${p.id}`}>{p.name}</Link>
                  </td>
                  <td>{p.sku}</td>
                  <td>{p.category || '-'}</td>
                  <td>₹{Number(p.unitPrice).toFixed(2)}</td>
                  <td style={{ color: p.currentStock <= p.minStockAlert ? 'var(--color-warning)' : undefined }}>
                    {p.currentStock}
                    {p.currentStock <= p.minStockAlert && ' ⚠'}
                  </td>
                  <td>{p.location || '-'}</td>
                  {canManage && (
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(p)}>
                        Edit
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {meta && meta.totalPages > 1 && (
        <div className="pagination">
          <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span>
            Page {meta.page} of {meta.totalPages} ({meta.total} total)
          </span>
          <button
            className="btn btn-secondary btn-sm"
            disabled={page >= meta.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="card modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>{editingProduct ? 'Edit product' : 'Add product'}</h3>
            </div>
            <Banner type="error" message={formError} />
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-field">
                  <label>Name *</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="form-field">
                  <label>SKU *</label>
                  <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} required />
                </div>
                <div className="form-field">
                  <label>Category</label>
                  <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
                </div>
                <div className="form-field">
                  <label>Unit price *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.unitPrice}
                    onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
                    required
                  />
                </div>
                <div className="form-field">
                  <label>Current stock</label>
                  <input
                    type="number"
                    min="0"
                    value={form.currentStock}
                    onChange={(e) => setForm({ ...form, currentStock: e.target.value })}
                    disabled={!!editingProduct}
                  />
                </div>
                <div className="form-field">
                  <label>Min stock alert</label>
                  <input
                    type="number"
                    min="0"
                    value={form.minStockAlert}
                    onChange={(e) => setForm({ ...form, minStockAlert: e.target.value })}
                  />
                </div>
                <div className="form-field">
                  <label>Warehouse / location</label>
                  <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                </div>
              </div>
              {editingProduct && (
                <p className="muted" style={{ fontSize: 12 }}>
                  To change stock quantity, use "Adjust stock" on the Inventory page instead - this keeps a movement
                  history.
                </p>
              )}
              <div className="toolbar" style={{ justifyContent: 'flex-end', marginTop: 16, marginBottom: 0 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn" disabled={saving}>
                  {saving ? 'Saving...' : 'Save product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
