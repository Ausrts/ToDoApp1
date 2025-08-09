import { StyleSheet, Text, View, Button, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchTodos, deleteTodo, updateTodo } from '../services/todoService';
import { useNavigation } from 'expo-router';
import { useRouter } from 'expo-router';

// Modify TodoItem component to support selection mode
// Replace this part in the TodoItem component with smart year display
const TodoItem = ({ item, onDelete, onToggleComplete, isSelecting, isSelected, onSelect }) => {
  const router = useRouter();
  
  // Function to format date and time
  const formatDueDate = (dueDateStr) => {
    if (!dueDateStr) return null;
    
    const date = new Date(dueDateStr);
    const now = new Date();
    const currentYear = now.getFullYear();
    const itemYear = date.getFullYear();
    
    // Check if it is the current year
    const isCurrentYear = currentYear === itemYear;
    
    // Determine display format based on year
    const options = isCurrentYear 
      ? {
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        }
      : {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        };
    
    return date.toLocaleString('en-US', options);
  };

  // 处理点击整个事项
  const handleItemPress = () => {
    if (isSelecting) {
      onSelect(item.id);
    } else {
      // 点击进入编辑页面
      router.push({ pathname: '/edit', params: { todo: JSON.stringify(item) } });
    }
  };

  return (
    <TouchableOpacity 
      style={[
        styles.todoItem,
        isSelecting && styles.selectingItem,
        isSelected && styles.selectedItem
      ]}
      onPress={handleItemPress}
    >
      {isSelecting && (
        <View style={[styles.selectButton, isSelected && styles.selectedButton]}>
          {isSelected && <Text style={styles.selectMark}>✓</Text>}
        </View>
      )}
      
      {!isSelecting && (
        <TouchableOpacity
          style={styles.completeButton}
          onPress={(e) => {
            e.stopPropagation(); // 阻止事件冒泡
            onToggleComplete(item.id, !item.completed);
          }}
        >
          {item.completed && <Text style={styles.checkMark}>✓</Text>}
        </TouchableOpacity>
      )}
      
      <View style={styles.todoContent}>
        <Text style={[styles.todoText, item.completed && styles.completedText]}>
          {item.title}
        </Text>
        {item.dueDate && (
          <Text style={styles.dueDate}>
            {formatDueDate(item.dueDate)}
          </Text>
        )}
      </View>
      
      {!isSelecting && (
        <View style={styles.buttons}>
          {/* 移除了 Edit 按钮，只保留 Delete 按钮 */}
          <TouchableOpacity 
            style={[styles.actionButton, styles.deleteButton]}
            onPress={(e) => {
              e.stopPropagation(); // 阻止事件冒泡
              onDelete(item.id);
            }}
          >
            <Text style={styles.deleteText}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
};

export default function HomeScreen() {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [isManaging, setIsManaging] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);

  // Fetch the to-do list
  const { data: todos = [], isLoading, error } = useQuery({
    queryKey: ['todos'],
    queryFn: fetchTodos,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  // Data filtering
  const filteredTodos = todos
    ? todos.filter(todo => 
        todo.title && typeof todo.title === 'string' && todo.title.trim() !== ''
      )
    : [];

  // Delete to-do items
  const deleteMutation = useMutation({
    mutationFn: async (ids) => {
      // Batch delete
      for (const id of ids) {
        await deleteTodo(id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
      setSelectedItems([]);
      setIsManaging(false);
      Alert.alert('Success', 'To-do items have been deleted');
    },
    onError: (error) => {
      Alert.alert('Error', `Delete failed: ${error.message}`);
    },
  });

  // Handle single delete
  const handleDelete = (id) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this to-do item?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', onPress: () => deleteMutation.mutate([id]) },
      ]
    );
  };

  // Handle batch delete
  const handleBatchDelete = () => {
    if (selectedItems.length === 0) {
      Alert.alert('Notice', 'Please select the to-do items to delete first');
      return;
    }

    Alert.alert(
      'Confirm Batch Delete',
      `Are you sure you want to delete the selected ${selectedItems.length} to-do items?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', onPress: () => deleteMutation.mutate(selectedItems) },
      ]
    );
  };

  // Select/Deselect all
  const handleSelectAll = () => {
    if (selectedItems.length === filteredTodos.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredTodos.map(item => item.id));
    }
  };

  // Select/Deselect individual item
  const handleSelectItem = (id) => {
    setSelectedItems(prev => 
      prev.includes(id) 
        ? prev.filter(itemId => itemId !== id)
        : [...prev, id]
    );
  };

  // Cancel management mode
  const handleCancelManage = () => {
    setIsManaging(false);
    setSelectedItems([]);
  };

  // Handle toggle complete state
  const handleToggleComplete = async (id, completed) => {
    try {
      const currentTodos = await AsyncStorage.getItem('@todos');
      if (currentTodos) {
        const todos = JSON.parse(currentTodos);
        const updatedTodos = todos.map(todo => 
          todo.id === id ? { ...todo, completed } : todo
        );
        await AsyncStorage.setItem('@todos', JSON.stringify(updatedTodos));
        queryClient.setQueryData(['todos'], updatedTodos);
      }
    } catch (error) {
      console.error('Failed to update status:', error);
      Alert.alert('Error', 'Failed to update status');
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7B68EE" />
        <Text>Loading...</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Loading failed</Text>
        <Text>{error.message}</Text>
        <TouchableOpacity
          style={[styles.roundButton, { backgroundColor: '#7B68EE' }]}
          onPress={() => queryClient.refetchQueries({ queryKey: ['todos'] })}
        >
          <Text style={styles.roundButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {/* <Text style={styles.title}>My To-Do List</Text> */}
        <View style={styles.headerButtons}>
          {isManaging ? (
            <>              
              <TouchableOpacity
                style={[styles.roundButton, { backgroundColor: '#017BFF' }]}
                onPress={handleSelectAll}
              >
                <Text style={styles.roundButtonText}>{`Select All (${selectedItems.length}/${filteredTodos.length})`}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.roundButton, { backgroundColor: '#FF3B30', opacity: selectedItems.length === 0 ? 0.5 : 1 }]}
                onPress={handleBatchDelete}
                disabled={selectedItems.length === 0}
              >
                <Text style={styles.roundButtonText}>Delete</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.roundButton, { backgroundColor: '#666' }]}
                onPress={handleCancelManage}
              >
                <Text style={styles.roundButtonText}>Cancel</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>              
              <TouchableOpacity
                style={[styles.roundButton, { backgroundColor: '#7B68EE' }]}
                onPress={() => setIsManaging(true)}
              >
                <Text style={styles.roundButtonText}>Manage</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.roundButton, { backgroundColor: '#017BFF' }]}
                onPress={() => navigation.navigate('add')}
              >
                <Text style={styles.roundButtonText}>Add</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <FlatList
        data={filteredTodos}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TodoItem
            item={item}
            onDelete={handleDelete}
            onToggleComplete={handleToggleComplete}
            isSelecting={isManaging}
            isSelected={selectedItems.includes(item.id)}
            onSelect={handleSelectItem}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No to-do items</Text>
            {isManaging && (
              <TouchableOpacity
                style={[styles.roundButton, { backgroundColor: '#666' }]}
                onPress={handleCancelManage}
              >
                <Text style={styles.roundButtonText}>Exit Manage</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  // Round button styles - directly use your defined styles
  roundButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  roundButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 20,
  },
  todoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  selectingItem: {
    backgroundColor: '#f8f8f8',
  },
  selectedItem: {
    backgroundColor: '#e6f2ff',
  },
  selectButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#7B68EE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  selectedButton: {
    backgroundColor: '#7B68EE',
  },
  selectMark: {
    color: 'white',
    fontWeight: 'bold',
  },
  completeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#7B68EE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkMark: {
    color: '#7B68EE',
    fontWeight: 'bold',
  },
  todoContent: {
    flex: 1,
  },
  todoText: {
    fontSize: 16,
    color: '#333',
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  dueDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ef5767',
    marginBottom: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 8,
  },
  buttons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  editButton: {
    backgroundColor: '#7B68EE',
  },
  deleteButton: {
    backgroundColor: '#ef5767',
  },
  editText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  deleteText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
});