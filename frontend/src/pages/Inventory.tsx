import { FormEvent, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, extractErrorMessage } from '../api/client';
import { Product, StockMovement } from '../types';
import Banner from '../components/Banner';

export default function Inventory() {
  const [searchParams, setSearchParams] = useSearchParams();
  const productId = searchParams.get('productId') ?? '';

  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [showAdjust, setShowAdjust] = useState(false);
  const [adjustType, setAdjustType] = useState<'IN' | 'OUT'>('IN');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [adjustError, setAdjustError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/products', { params: { pageSize: 100 } }).then((res) => setProducts(res.data.data));
  }, []);

  function loadMovements(id: string) {
    if (!id) {
      setMovements([]);
      return;
    }
    setLoading(true);
    api
      .get(`/products/${id}/movements`)
      .then((res) => setMovements(res.data.data))
      .catch((err) => setError(extractErrorMessage(err)))
      .finally(() => setLoading(false));
  }

  useEffect(() => loadMovements(productId), [productId]);

  const selectedProduct = products.find((p) => p.id === productId);

  async function handleAdjust(e: FormEvent) {
    e.preventDefault();
    if (!productId) return;
    setAdjustError('');
    setSaving(true);
    try {
      await api.post(`/products/${productId}/stock`, {
        quantity: Number(quantity),
        movementType: adjustType,
        reason,
      });
      setShowAdjust(false);
      setQuantity('');
      setReason('');
      loadMovements(productId);
      api.get('/products', { params: { pageSize: 100 } }).then((res) => setProducts(res.data.data));
    } catch (err) {
      setAdjustError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Inventory</h1>
          <p className="page-subtitle">Stock levels and movement history</p>
        </div>
      </div>

      <div className="toolbar">
        <select
          style={{ maxWidth: 320 }}
          value={productId}
          onChange={(e) => setSearchParams(e.target.value ? { productId: e.target.value } : {})}
        >
          <option value="">Select a product...</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.sku})
            </option>
          ))}
        </select>
        {selectedProduct && (
          <button className="btn" onClick={() => setShowAdjust(true)}>
            Adjust stock
          </button>
        )}
      </div>

      <Banner type="error" message={error} />

      {selectedProduct && (
        <div className="stat-grid">
          <div className="card">
            <div className="stat-label">Current stock</div>
            <div className="stat-value">{selectedProduct.currentStock}</div>
          </div>
          <div className="card">
            <div className="stat-label">Min stock alert</div>
            <div className="stat-value">{selectedProduct.minStockAlert}</div>
          </div>
          <div className="card">
            <div className="stat-label">Location</div>
            <div>{selectedProduct.location || '-'}</div>
          </div>
        </div>
      )}

      <div className="card">
        {!productId ? (
          <div className="empty-state">Select a product above to view its stock movement history.</div>
        ) : loading ? (
          <div className="loading-state">Loading movements...</div>
        ) : movements.length === 0 ? (
          <div className="empty-state">No stock movements recorded for this product yet.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Quantity</th>
                <th>Reason</th>
                <th>By</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => (
                <tr key={m.id}>
                  <td>{new Date(m.createdAt).toLocaleString()}</td>
                  <td>
                    <span className={m.movementType === 'IN' ? 'badge badge-active' : 'badge badge-inactive'}>
                      {m.movementType}
                    </span>
                  </td>
                  <td>{m.quantity}</td>
                  <td>{m.reason}</td>
                  <td>{m.createdBy?.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showAdjust && selectedProduct && (
        <div className="modal-overlay" onClick={() => setShowAdjust(false)}>
          <div className="card modal-card" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>Adjust stock - {selectedProduct.name}</h3>
            </div>
            <Banner type="error" message={adjustError} />
            <form onSubmit={handleAdjust}>
              <div className="form-field" style={{ marginBottom: 12 }}>
                <label>Movement type</label>
                <select value={adjustType} onChange={(e) => setAdjustType(e.target.value as 'IN' | 'OUT')}>
                  <option value="IN">IN - receiving stock</option>
                  <option value="OUT">OUT - removing stock</option>
                </select>
              </div>
              <div className="form-field" style={{ marginBottom: 12 }}>
                <label>Quantity</label>
                <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
              </div>
              <div className="form-field">
                <label>Reason</label>
                <input value={reason} onChange={(e) => setReason(e.target.value)} required />
              </div>
              <div className="toolbar" style={{ justifyContent: 'flex-end', marginTop: 16, marginBottom: 0 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAdjust(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn" disabled={saving}>
                  {saving ? 'Saving...' : 'Save adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
