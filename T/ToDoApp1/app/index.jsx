import { StyleSheet, Text, View, Button, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage'; // 添加这行
import { fetchTodos, deleteTodo, updateTodo } from '../services/todoService';
import { useNavigation } from 'expo-router';

// 导入路由
import { useRouter } from 'expo-router';

// 修改TodoItem组件
const TodoItem = ({ item, onDelete, onToggleComplete }) => {
  const router = useRouter();
  
  return (
    <View style={styles.todoItem}>
      <TouchableOpacity
        style={styles.completeButton}
        onPress={() => onToggleComplete(item.id, !item.completed)}
      >
        {item.completed && <Text style={styles.checkMark}>✓</Text>}
      </TouchableOpacity>
      
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
      
      <View style={styles.buttons}>
        <TouchableOpacity 
          style={styles.editButton}
          onPress={() => router.push({ pathname: '/edit', params: { todo: JSON.stringify(item) } })}
        >
          <Text style={styles.editText}>编辑</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={() => onDelete(item.id)}
        >
          <Text style={styles.deleteText}>删除</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function HomeScreen() {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  // 获取待办事项列表
  const { data: todos = [], isLoading, error } = useQuery({
    queryKey: ['todos'],
    queryFn: fetchTodos,
    refetchOnWindowFocus: true, // 窗口获得焦点时重新获取数据
    staleTime: 0, // 数据立即过期，确保每次获取最新数据
  });

  // 添加调试日志
  React.useEffect(() => {
    console.log('原始数据:', todos);
    console.log('过滤后数据:', filteredTodos);
  }, [todos, filteredTodos]);

  // 添加数据过滤：移除标题为空或无效的待办事项
  const filteredTodos = todos
    ? todos.filter(todo => 
        // 确保标题存在且不为空字符串
        todo.title && typeof todo.title === 'string' && todo.title.trim() !== ''
      )
    : [];

  // 删除待办事项
const deleteMutation = useMutation({
  mutationFn: deleteTodo,
  onSuccess: () => {
    // 使缓存的todos查询失效，触发重新获取
    queryClient.invalidateQueries({ queryKey: ['todos'] });
    Alert.alert('成功', '待办事项已删除');
  },
  onError: (error) => {
    Alert.alert('错误', `删除失败: ${error.message}`);
  },
});

  // 处理删除
  const handleDelete = (id) => {
    Alert.alert(
      '确认删除',
      '确定要删除这个待办事项吗？',
      [
        { text: '取消', style: 'cancel' },
        { text: '删除', onPress: () => deleteMutation.mutate(id) },
      ]
    );
  };

  // 下拉刷新
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await queryClient.refetchQueries({ queryKey: ['todos'] });
    } finally {
      setRefreshing(false);
    }
  };

  // 添加标记完成状态处理函数
  const handleToggleComplete = async (id, completed) => {
    try {
      // 更新本地存储
      const currentTodos = await AsyncStorage.getItem('@todos');
      if (currentTodos) {
        const todos = JSON.parse(currentTodos);
        const updatedTodos = todos.map(todo => 
          todo.id === id ? { ...todo, completed } : todo
        );
        await AsyncStorage.setItem('@todos', JSON.stringify(updatedTodos));
        
        // 更新React Query缓存
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
        <Button
          title="重试"
          onPress={() => queryClient.refetchQueries({ queryKey: ['todos'] })}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>我的待办事项</Text>
        <Button
          title="添加"
          onPress={() => navigation.navigate('add')}
          color="#0066cc"
        />
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color="#0066cc" style={styles.loader} />
      ) : error ? (
        <Text style={styles.error}>加载失败: {error.message}</Text>
      ) : (
        <FlatList
          data={filteredTodos} // 使用过滤后的数据
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <TodoItem
              item={item}  // 修复：将todo改为item
              onDelete={handleDelete}
              onToggleComplete={handleToggleComplete}
            />
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>暂无待办事项</Text>}
          contentContainerStyle={styles.listContent}
        />
      )}
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
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
  // 添加空状态样式
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
  emptySubText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  buttons: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  editText: {
    color: 'white',
    fontSize: 12,
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  deleteText: {
    color: 'white',
    fontSize: 12,
  },
});

