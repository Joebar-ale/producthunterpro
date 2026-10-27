import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, FlatList } from 'react-native';

export default function CustomersScreen() {
  const handleNewCustomer = () => {
    Alert.alert('Nuevo Cliente', 'Funcionalidad de crear cliente en desarrollo.');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Listado de Clientes</Text>
      
      <FlatList
        data={[]}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => <View />}
        ListEmptyComponent={<Text style={styles.emptyText}>No hay clientes registrados.</Text>}
        contentContainerStyle={styles.listContent}
      />

      <TouchableOpacity style={styles.button} onPress={handleNewCustomer}>
        <Text style={styles.buttonText}>+ Nuevo Cliente</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  listContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: '#888',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
