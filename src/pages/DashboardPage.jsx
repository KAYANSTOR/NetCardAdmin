import { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Users, UserCheck, DollarSign, TrendingUp, Activity, AlertTriangle } from 'lucide-react';
import StatsCard from '../components/StatsCard';
import LoadingSpinner from '../components/LoadingSpinner';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [appStatus, setAppStatus] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch app status and global config
      const configDoc = await getDoc(doc(db, 'app_settings', 'global_config'));
      let globalCommission = 5;
      if (configDoc.exists()) {
        const configData = configDoc.data();
        setAppStatus(configData);
        globalCommission = configData.default_commission_rate || 5;
      }

      // Fetch users
      const usersSnap = await getDocs(collection(db, 'users'));
      const users = [];
      usersSnap.forEach((d) => users.push({ uid: d.id, ...d.data() }));

      const totalUsers = users.length;
      const trialUsers = users.filter((u) => u.is_trial === true).length;
      const activeUsers = users.filter((u) => u.is_active !== false).length;
      const blockedUsers = users.filter((u) => u.is_active === false).length;

      // Fetch sales for all networks
      let totalSales = 0;
      let totalAdminEarnings = 0;
      let totalTransactions = 0;

      for (const user of users) {
        const activeRate = (user.commission_rate != null && user.commission_rate > 0)
          ? user.commission_rate
          : globalCommission;

        const salesSnap = await getDocs(
          collection(db, 'networks', user.uid, 'sales')
        );
        salesSnap.forEach((saleDoc) => {
          const sale = saleDoc.data();
          if (sale.status === 'COMPLETED') {
            totalTransactions++;
            const faceValue = sale.faceValue || 0;
            totalSales += faceValue;
            totalAdminEarnings += faceValue * (activeRate / 100);
          }
        });
      }

      setStats({
        totalUsers,
        trialUsers,
        activeUsers,
        blockedUsers,
        totalSales,
        totalAdminEarnings,
        totalTransactions,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
    setLoading(false);
  };

  if (loading) return <LoadingSpinner size="lg" />;

  const formatNumber = (num) => {
    return new Intl.NumberFormat('ar-IQ').format(Math.round(num || 0));
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="page-title">لوحة التحكم</h1>
        <p className="text-gray-500 mt-1">نظرة عامة على النظام</p>
      </div>

      {/* App Status Banner */}
      {appStatus && !appStatus.is_app_active && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-red-800">التطبيق متوقف حالياً (وضع الصيانة)</p>
            {appStatus.maintenance_message && (
              <p className="text-sm text-red-600 mt-1">{appStatus.maintenance_message}</p>
            )}
          </div>
        </div>
      )}

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
          <StatsCard
            title="إجمالي المستخدمين"
            value={formatNumber(stats.totalUsers)}
            icon={Users}
            color="blue"
          />
          <StatsCard
            title="مستخدمون تجريبيون"
            value={formatNumber(stats.trialUsers)}
            icon={Activity}
            color="orange"
          />
          <StatsCard
            title="مستخدمون نشطون"
            value={formatNumber(stats.activeUsers)}
            icon={UserCheck}
            color="green"
          />
          <StatsCard
            title="محظورون"
            value={formatNumber(stats.blockedUsers)}
            icon={AlertTriangle}
            color="red"
          />
          <StatsCard
            title="إجمالي المبيعات"
            value={formatNumber(stats.totalSales)}
            icon={DollarSign}
            color="cyan"
            subtitle="دينار"
          />
          <StatsCard
            title="أرباح الإدارة"
            value={formatNumber(stats.totalAdminEarnings)}
            icon={TrendingUp}
            color="purple"
            subtitle="دينار"
          />
          <StatsCard
            title="عمليات البيع الناجحة"
            value={formatNumber(stats.totalTransactions)}
            icon={DollarSign}
            color="green"
          />
        </div>
      )}
    </div>
  );
}
