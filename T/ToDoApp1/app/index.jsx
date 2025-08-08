import { StyleSheet, Text, View, Button, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchTodos, deleteTodo, updateTodo } from '../services/todoService';
import { useNavigation } from 'expo-router';
import { useRouter } from 'expo-router';

// 修改TodoItem组件，支持选择模式
const TodoItem = ({ item, onDelete, onToggleComplete, isSelecting, isSelected, onSelect }) => {
  const router = useRouter();
  
  return (
    <TouchableOpacity 
      style={[
        styles.todoItem,
        isSelecting && styles.selectingItem,
        isSelected && styles.selectedItem
      ]}
      onPress={() => isSelecting && onSelect(item.id)}
      disabled={!isSelecting}
    >
      {isSelecting && (
        <View style={[styles.selectButton, isSelected && styles.selectedButton]}>
          {isSelected && <Text style={styles.selectMark}>✓</Text>}
        </View>
      )}
      
      {!isSelecting && (
        <TouchableOpacity
          style={styles.completeButton}
          onPress={() => onToggleComplete(item.id, !item.completed)}
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
            截止日期: {new Date(item.dueDate).toLocaleDateString()}
          </Text>
        )}
      </View>
      
      {!isSelecting && (
        <View style={styles.buttons}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.editButton]}
            onPress={() => router.push({ pathname: '/edit', params: { todo: JSON.stringify(item) } })}
          >
            <Text style={styles.editText}>编辑</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => onDelete(item.id)}
          >
            <Text style={styles.deleteText}>删除</Text>
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

  // 获取待办事项列表
  const { data: todos = [], isLoading, error } = useQuery({
    queryKey: ['todos'],
    queryFn: fetchTodos,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  // 添加数据过滤
  const filteredTodos = todos
    ? todos.filter(todo => 
        todo.title && typeof todo.title === 'string' && todo.title.trim() !== ''
      )
    : [];

  // 删除待办事项
  const deleteMutation = useMutation({
    mutationFn: async (ids) => {
      // 批量删除
      for (const id of ids) {
        await deleteTodo(id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
      setSelectedItems([]);
      setIsManaging(false);
      Alert.alert('成功', '待办事项已删除');
    },
    onError: (error) => {
      Alert.alert('错误', `删除失败: ${error.message}`);
    },
  });

  // 处理单个删除
  const handleDelete = (id) => {
    Alert.alert(
      '确认删除',
      '确定要删除这个待办事项吗？',
      [
        { text: '取消', style: 'cancel' },
        { text: '删除', onPress: () => deleteMutation.mutate([id]) },
      ]
    );
  };

  // 处理批量删除
  const handleBatchDelete = () => {
    if (selectedItems.length === 0) {
      Alert.alert('提示', '请先选择要删除的待办事项');
      return;
    }

    Alert.alert(
      '确认批量删除',
      `确定要删除选中的 ${selectedItems.length} 个待办事项吗？`,
      [
        { text: '取消', style: 'cancel' },
        { text: '删除', onPress: () => deleteMutation.mutate(selectedItems) },
      ]
    );
  };

  // 全选/取消全选
  const handleSelectAll = () => {
    if (selectedItems.length === filteredTodos.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredTodos.map(item => item.id));
    }
  };

  // 选择/取消选择单个项目
  const handleSelectItem = (id) => {
    setSelectedItems(prev => 
      prev.includes(id) 
        ? prev.filter(itemId => itemId !== id)
        : [...prev, id]
    );
  };

  // 取消管理模式
  const handleCancelManage = () => {
    setIsManaging(false);
    setSelectedItems([]);
  };

  // 标记完成状态处理
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
      console.error('更新状态失败:', error);
      Alert.alert('错误', '更新状态失败');
    }
  };

  // 加载中状态
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
        <Text>加载中...</Text>
      </View>
    );
  }

  // 错误状态
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>加载失败</Text>
        <Text>{error.message}</Text>
        <TouchableOpacity
          style={[styles.roundButton, { backgroundColor: '#0066cc' }]}
          onPress={() => queryClient.refetchQueries({ queryKey: ['todos'] })}
        >
          <Text style={styles.roundButtonText}>重试</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>我的待办事项</Text>
        <View style={styles.headerButtons}>
          {isManaging ? (
            <>
              <TouchableOpacity
                style={[styles.roundButton, { backgroundColor: '#007AFF' }]}
                onPress={handleSelectAll}
              >
                <Text style={styles.roundButtonText}>{`全选 (${selectedItems.length}/${filteredTodos.length})`}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.roundButton, { backgroundColor: '#FF3B30', opacity: selectedItems.length === 0 ? 0.5 : 1 }]}
                onPress={handleBatchDelete}
                disabled={selectedItems.length === 0}
              >
                <Text style={styles.roundButtonText}>删除</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.roundButton, { backgroundColor: '#666' }]}
                onPress={handleCancelManage}
              >
                <Text style={styles.roundButtonText}>取消</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.roundButton, { backgroundColor: '#007AFF' }]}
                onPress={() => setIsManaging(true)}
              >
                <Text style={styles.roundButtonText}>管理</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.roundButton, { backgroundColor: '#0066cc' }]}
                onPress={() => navigation.navigate('add')}
              >
                <Text style={styles.roundButtonText}>添加</Text>
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
            <Text style={styles.emptyText}>暂无待办事项</Text>
            {isManaging && (
              <TouchableOpacity
                style={[styles.roundButton, { backgroundColor: '#666' }]}
                onPress={handleCancelManage}
              >
                <Text style={styles.roundButtonText}>退出管理</Text>
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
  // 圆角按钮样式 - 直接使用你定义的样式
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
    borderColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  selectedButton: {
    backgroundColor: '#007AFF',
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
    borderColor: '#0066cc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkMark: {
    color: '#0066cc',
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
    color: '#ff3b30',
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
    backgroundColor: '#007AFF',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
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

