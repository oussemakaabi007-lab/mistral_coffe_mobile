import * as SecureStore from 'expo-secure-store';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import api from '../../api/api';

interface DailyVente {
  id: number;
  heure: string;
  serveur: string;
  montant: string;
  details: string;
  posteId: string;
}

const DailySales: React.FC = () => {
  const [ventes, setVentes] = useState<DailyVente[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [postetype, setPostetype] = useState<'AVANT_MIDI' | 'APRES_MIDI' | null>(null);
  const parseMontant = (montantStr: string) => {
    return parseFloat(montantStr.replace(/[^0-9.]/g, '')) || 0;
  };

  const fetchSales = useCallback(async () => {
    try {
      const storedUser = await SecureStore.getItemAsync('userData');
      const user = storedUser ? JSON.parse(storedUser) : null;
      
      const dateStr = new Date().toISOString().split('T')[0];
      const res = await api.get(`/analyses/journal-quotidien?date=${dateStr}`);
      const poste = await api.get(`/sessions-poste/my_active`);
      setPostetype(poste.data?.type || null);
      const userVentes = res.data.ventes.filter(
        (v: DailyVente) => v.posteId === poste.data?.id && v.serveur === user?.nomUtilisateur
      );
      
      
      setVentes(userVentes);
    } catch (err) {
      console.error("Erreur de chargement:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const totalRevenu = ventes.reduce((sum, item) => sum + parseMontant(item.montant), 0);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSales();
  };

  const renderItem = ({ item }: { item: DailyVente }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.time}>{item.heure}</Text>
        <Text style={styles.serverTag}>{item.serveur}</Text>
      </View>
      <Text style={styles.details}>{item.details}</Text>
      <Text style={styles.prodPrice}>{item.montant}</Text>
    </View>
  );

  if (loading && !refreshing) return <View style={styles.center}><ActivityIndicator size="large" color="#8C5832" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mes Commandes du jour</Text>
      </View>
      <View style={styles.totalSummaryCard}>
        <Text style={styles.totalSummaryLabel}>Revenus Totaux</Text>
        <Text style={styles.totalSummaryValue}>{totalRevenu.toFixed(3)} DT</Text>
      </View>

      <FlatList
        data={ventes}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor="#8C5832" 
            colors={["#8C5832"]} 
          />
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>Aucune commande enregistrée pour aujourd'hui.</Text>
        }
      />
    </View>
  );
};

export default DailySales;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4EFE6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 25, backgroundColor: '#2D1F16', paddingTop: 40 },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  totalSummaryCard: { 
    margin: 15, 
    marginBottom: 5,
    padding: 20, 
    backgroundColor: '#8C5832', 
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    elevation: 3
  },
  totalSummaryLabel: { color: '#F4EFE6', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' },
  totalSummaryValue: { color: '#fff', fontSize: 28, fontWeight: '900', marginTop: 5 },

  listContent: { padding: 15 },
  card: { 
    backgroundColor: '#fff', 
    padding: 15, 
    borderRadius: 10, 
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#D9CFC1'
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  time: { fontSize: 12, color: '#8C5832', fontWeight: 'bold' },
  serverTag: { 
    fontSize: 10, 
    fontWeight: 'bold', 
    backgroundColor: '#D9CFC1', 
    paddingHorizontal: 8, 
    paddingVertical: 2, 
    borderRadius: 10 
  },
  details: { fontSize: 14, color: '#2D1F16', marginBottom: 8 },
  prodPrice: { color: '#8C5832', fontWeight: 'bold', fontSize: 16, textAlign: 'right' },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#8C5832', fontSize: 14 }
});