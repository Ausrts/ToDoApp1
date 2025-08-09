import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addTodo } from '../services/todoService';
import { useNavigation } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, StyleSheet, View, Text, TextInput, Button, Platform } from 'react-native';

export default function AddTodoScreen() {
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const navigation = useNavigation();
  const queryClient = useQueryClient();

  // ✅ 使用setTimeout+Alert的兼容提醒系统
  const scheduleLocalReminder = (todoTitle, dueDate) => {
    const now = new Date();
    const fiveMinBefore = new Date(dueDate);
    fiveMinBefore.setMinutes(fiveMinBefore.getMinutes() - 5);
    
    // 5分钟前提醒
    if (fiveMinBefore > now) {
      const delay = fiveMinBefore.getTime() - now.getTime();
      console.log(`⏰ 设置5分钟前提醒: "${todoTitle}" 将在 ${Math.round(delay/1000)} 秒后提醒`);
      setTimeout(() => {
        Alert.alert('⏰ 待办提醒', `"${todoTitle}" 还有5分钟到期`);
      }, delay);
    }
    
    // 到期提醒
    if (dueDate > now) {
      const delay = dueDate.getTime() - now.getTime();
      console.log(`🔔 设置到期提醒: "${todoTitle}" 将在 ${Math.round(delay/1000)} 秒后提醒`);
      setTimeout(() => {
        Alert.alert('🔔 待办到期', `"${todoTitle}" 现在到期了`);
      }, delay);
    }
  };

  // 显示添加成功通知
  const showLocalNotification = (todoTitle) => {
    Alert.alert(
      '✅ 待办已添加',
      `"${todoTitle}" 已成功添加，将在指定时间提醒您！`,
      [{ text: '确定' }]
    );
  };

  // ✅ 修正后的Mutation，使用scheduleLocalReminder
  const addMutation = useMutation({
    mutationFn: addTodo,
    onSuccess: async (newTodo) => {
      try {
        const existingTodos = JSON.parse(await AsyncStorage.getItem('@todos')) || [];

        // 生成唯一ID
        const existingIds = existingTodos.map(todo => todo.id);
        let newId = Date.now() + Math.floor(Math.random() * 1000);
        while (existingIds.includes(newId)) {
          newId = Date.now() + Math.floor(Math.random() * 1000);
        }

        const todoToAdd = {
          id: newId,
          title: newTodo.title || title.trim(),
          completed: newTodo.completed || false,
          userId: newTodo.userId || 1,
          dueDate: newTodo.dueDate || dueDate.toISOString()
        };
        
        const updatedTodos = [...existingTodos, todoToAdd];
        await AsyncStorage.setItem('@todos', JSON.stringify(updatedTodos));
        
        queryClient.invalidateQueries({ queryKey: ['todos'] });
        
        // ✅ 使用兼容的提醒系统
        scheduleLocalReminder(todoToAdd.title, new Date(todoToAdd.dueDate));
        showLocalNotification(todoToAdd.title);
        
        navigation.goBack();
      } catch (error) {
        console.error('保存失败:', error);
        Alert.alert('错误', '保存失败，请重试');
      }
    },
    onError: (error) => {
      Alert.alert('错误', `添加失败: ${error.message}`);
    },
  });

  // Handle date selection
  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate < today) {
        Alert.alert(
          '日期提示',
          `选择的日期 ${selectedDate.toLocaleDateString()} 是过去的日期，您确定要添加吗？`,
          [
            { text: '确定', onPress: () => setDueDate(selectedDate) },
            { text: '重新选择', onPress: () => setShowDatePicker(true) }
          ]
        );
      } else {
        setDueDate(selectedDate);
      }
    }
  };

  const handleTimeChange = (event, selectedTime) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      const newDate = new Date(dueDate);
      newDate.setHours(selectedTime.getHours());
      newDate.setMinutes(selectedTime.getMinutes());
      setDueDate(newDate);
    }
  };

  const showDatePickerDialog = () => setShowDatePicker(true);
  const showTimePickerDialog = () => setShowTimePicker(true);

  const handleSubmit = () => {
    if (!title.trim()) {
      Alert.alert('输入错误', '请输入待办标题');
      return;
    }

    addMutation.mutate({
      title: title.trim(),
      completed: false,
      userId: 1,
      dueDate: dueDate.toISOString()
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>添加新待办</Text>

      <TextInput
        style={styles.input}
        placeholder="请输入待办标题"
        value={title}
        onChangeText={setTitle}
        autoFocus
      />

      <View style={styles.dateContainer}>
        <Button
          title="选择截止日期"
          onPress={showDatePickerDialog}
          color="#017BFF"
        />
        <Text style={styles.dateText}>
          已选择: {dueDate.toLocaleDateString()}
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

      <View style={styles.dateContainer}>
        <Button
          title="设置提醒时间"
          onPress={showTimePickerDialog}
          color="#017BFF"
        />
        <Text style={styles.dateText}>
          提醒时间: {dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
        {showTimePicker && (
          <DateTimePicker
            value={dueDate}
            mode="time"
            display="spinner"
            onChange={handleTimeChange}
          />
        )}
      </View>

      <View style={styles.buttonContainer}>
        <Button
          title="取消"
          onPress={() => navigation.goBack()}
          color="#017BFF"
        />
        <Button
          title="添加"
          onPress={handleSubmit}
          color="#017BFF"
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
});