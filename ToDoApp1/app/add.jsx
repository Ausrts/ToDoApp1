import { StyleSheet, Text, View, TextInput, Button, Alert, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
// 更新导入路径
import { addTodo } from '../services/todoService';
import { useNavigation } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage'; // 添加这行

export default function AddTodoScreen() {
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const navigation = useNavigation();
  const queryClient = useQueryClient();

  // 添加待办事项的mutation
  // 修改addMutation的onSuccess回调
  const addMutation = useMutation({
    mutationFn: addTodo,
    onSuccess: async (newTodo) => {
      // 添加调试日志，查看 API 返回的数据结构
      console.log('API 返回的新待办事项:', newTodo);

      try {
        const existingTodos = JSON.parse(await AsyncStorage.getItem('@todos')) || [];

        // 检查现有ID并生成新ID直至唯一
        const existingIds = existingTodos.map(todo => todo.id);
        let newId = Date.now() + Math.floor(Math.random() * 1000);
        while (existingIds.includes(newId)) {
          newId = Date.now() + Math.floor(Math.random() * 1000);
        }

        // 确保新待办事项有正确的结构
        const todoToAdd = {
          id: newId, // 使用经过冲突检查的ID
          title: newTodo.title || title.trim(),
          completed: newTodo.completed || false,
          userId: newTodo.userId || 1,
          dueDate: newTodo.dueDate || dueDate.toISOString()
        };
        
        const updatedTodos = [...existingTodos, todoToAdd];
        console.log('更新后的待办事项列表:', updatedTodos);
        
        await AsyncStorage.setItem('@todos', JSON.stringify(updatedTodos));
        
        // 强制刷新缓存而不是直接设置
        queryClient.invalidateQueries({ queryKey: ['todos'] });
        
        Alert.alert('成功', '待办事项已添加');
        navigation.goBack();
      } catch (error) {
        console.error('保存到本地存储失败:', error);
        Alert.alert('错误', '保存失败，请重试');
      }
    },
    onError: (error) => {
      Alert.alert('错误', `添加失败: ${error.message}`);
    },
  });

  // 处理日期选择
  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDueDate(selectedDate);
    }
  };

  // 显示日期选择器
  const showDatePickerDialog = () => {
    setShowDatePicker(true);
  };

  // 处理表单提交
  // 修改提交数据，添加userId字段
  const handleSubmit = () => {
    if (!title.trim()) {
      Alert.alert('输入错误', '请输入待办事项标题');
      return;
    }

    // 添加调试日志，查看提交的数据
    const newTodoData = {
      title: title.trim(),
      completed: false,
      userId: 1,
      dueDate: dueDate.toISOString() // 添加日期字段
    };
    console.log('提交的待办事项数据:', newTodoData);

    addMutation.mutate(newTodoData);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>添加新待办事项</Text>

      <TextInput
        style={styles.input}
        placeholder="输入待办事项标题"
        value={title}
        onChangeText={setTitle}
        autoFocus
      />

      <View style={styles.dateContainer}>
        <Button
          title="选择截止日期"
          onPress={showDatePickerDialog}
          color="#0066cc"
        />
        <Text style={styles.dateText}>
          当前选择: {dueDate.toLocaleDateString()}
        </Text>
        {showDatePicker && (
          <DateTimePicker
            value={dueDate}
            mode="date"
            display="default"
            onChange={handleDateChange}
          />
        )}
      </View>

      <View style={styles.buttonContainer}>
        <Button
          title="取消"
          onPress={() => navigation.goBack()}
          style={styles.cancelButton}
        />
        <Button
          title="添加"
          onPress={handleSubmit}
          color="#0066cc"
          disabled={addMutation.isPending}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#333',
  },
  input: {
    height: 48,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 24,
    backgroundColor: 'white',
  },
  dateContainer: {
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  dateText: {
    fontSize: 16,
    color: '#666',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'center',
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
  },
});