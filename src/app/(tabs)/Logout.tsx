import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import api from '../../api/api';

interface DailyVente {
  heure: string;
  serveur: string;
  montant: string;
  posteId: string;
}

const LogoutScreen = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ totalRevenu: 0, heureDebut: '' });

  const parseMontant = (montantStr: string) => parseFloat(montantStr.replace(/[^0-9.]/g, '')) || 0;

  const fetchStats = async () => {
    try {
      const storedUser = await SecureStore.getItemAsync('userData');
      const user = storedUser ? JSON.parse(storedUser) : null;
      
      const dateStr = new Date().toISOString().split('T')[0];
      const res = await api.get(`/analyses/journal-quotidien?date=${dateStr}`);
      const poste = await api.get(`/sessions-poste/my_active`);
      const userVentes = res.data.ventes.filter(
        (v: DailyVente) => v.posteId === poste.data?.id && v.serveur === user?.nomUtilisateur
      );
      
      const total = userVentes.reduce((sum: number, item: DailyVente) => sum + parseMontant(item.montant), 0);
      const debut = poste.data 
        ? new Date(poste.data["dateOuverture"]).toLocaleDateString('fr-FR') + " " + new Date(poste.data["dateOuverture"]).toLocaleTimeString('fr-FR') 
        : "--:--";
      
      setStats({ totalRevenu: total, heureDebut: debut });
    } catch (error) {
      console.error("Erreur stats:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
      
      await SecureStore.deleteItemAsync('userData');
      await SecureStore.deleteItemAsync('userToken');
      router.replace('/Login');
    } catch (error) {
      Alert.alert("Erreur", "Impossible de fermer le shift.");
    }
  };

  if (loading && !refreshing) return <View style={styles.center}><ActivityIndicator size="large" color="#8C5832" /></View>;

  return (
    <ScrollView 
      contentContainerStyle={styles.scrollContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8C5832" />
      }
    >
      <Text style={styles.title}>Fin de Shift</Text>
      
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.label}>Revenu Total</Text>
          <Text style={styles.value}>{stats.totalRevenu.toFixed(3)} DT</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.label}>Ouvert depuis</Text>
          <Text style={styles.value}>{stats.heureDebut}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.btnText}>Confirmer la déconnexion</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: { flexGrow: 1, backgroundColor: '#F4EFE6', padding: 20, justifyContent: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#2D1F16', textAlign: 'center', marginBottom: 40 },
  statsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 50 },
  statBox: { backgroundColor: '#fff', padding: 20, borderRadius: 12, width: '47%', alignItems: 'center', borderWidth: 1, borderColor: '#D9CFC1' },
  label: { fontSize: 12, color: '#8C5832', textTransform: 'uppercase', marginBottom: 10 },
  value: { fontSize: 18, fontWeight: '900', color: '#2D1F16' },
  logoutBtn: { backgroundColor: '#A93226', padding: 20, borderRadius: 10 },
  btnText: { color: '#fff', textAlign: 'center', fontWeight: 'bold' }
});
export default LogoutScreen;