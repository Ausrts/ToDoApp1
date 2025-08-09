import React, { useState } from 'react';
import { 
  View, 
  TextInput, 
  Button, 
  StyleSheet, 
  Alert, 
  TouchableOpacity, 
  Text,
  Platform 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { updateTodo } from '../services/todoService';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function EditScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { todo: todoString } = useLocalSearchParams();
  
  // Parse the to-do item data
  const todo = todoString ? JSON.parse(todoString) : { id: null, title: '' };
  const [title, setTitle] = useState(todo.title || '');
  const [dueDate, setDueDate] = useState(todo.dueDate ? new Date(todo.dueDate) : new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('错误', '请输入待办内容');
      return;
    }

    try {
      const updatedTodo = { 
        ...todo, 
        title: title.trim(),
        dueDate: dueDate.toISOString()
      };
      await updateTodo(updatedTodo);
      
      // Refresh the to-do list
      await queryClient.invalidateQueries(['todos']);
      
      // Go back to the previous page
      router.back();
    } catch (error) {
      Alert.alert('错误', '保存失败，请重试');
      console.error('Save error:', error);
    }
  };

  // 处理日期选择
  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate < today) {
        Alert.alert(
          '日期提示',
          `选择的日期 ${selectedDate.toLocaleDateString()} 是过去的日期，您确定要修改吗？`,
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

  // 处理时间选择
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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>编辑待办</Text>

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
          已选择: {dueDate.toLocaleDateString('zh-CN')}
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
          onPress={() => router.back()}
          color="#017BFF"
        />
        <Button
          title="保存"
          onPress={handleSave}
          color="#017BFF"
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