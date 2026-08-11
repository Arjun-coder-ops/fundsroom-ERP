import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, extractErrorMessage } from '../api/client';
import Banner from '../components/Banner';

interface DashboardStats {
  totalCustomers: number;
  totalProducts: number;
  totalChallans: number;
  draftChallans: number;
  confirmedChallans: number;
  lowStockCount: number;
  lowStockProducts: { id: string; name: string; sku: string; currentStock: number; minStockAlert: number }[];
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/dashboard')
      .then((res) => setStats(res.data.data))
      .catch((err) => setError(extractErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="page-subtitle">Operations overview</p>
        </div>
      </div>

      <Banner type="error" message={error} />

      {loading && <div className="loading-state">Loading dashboard...</div>}

      {stats && (
        <>
          <div className="stat-grid">
            <div className="card stat-card">
              <div className="stat-label">Total Customers</div>
              <div className="stat-value">{stats.totalCustomers}</div>
            </div>
            <div className="card stat-card">
              <div className="stat-label">Total Products</div>
              <div className="stat-value">{stats.totalProducts}</div>
            </div>
            <div className={`card stat-card ${stats.lowStockCount > 0 ? 'warning' : ''}`}>
              <div className="stat-label">Low Stock Products</div>
              <div className="stat-value">{stats.lowStockCount}</div>
            </div>
            <div className="card stat-card">
              <div className="stat-label">Total Challans</div>
              <div className="stat-value">{stats.totalChallans}</div>
              <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                {stats.draftChallans} draft · {stats.confirmedChallans} confirmed
              </div>
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Low stock products</h3>
            {stats.lowStockProducts.length === 0 ? (
              <div className="empty-state">No products are currently below their minimum stock level.</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU</th>
                    <th>Current Stock</th>
                    <th>Min Alert</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.lowStockProducts.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <Link to="/products">{p.name}</Link>
                      </td>
                      <td>{p.sku}</td>
                      <td>{p.currentStock}</td>
                      <td>{p.minStockAlert}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
