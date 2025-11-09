// 初始化Firebase
        firebase.initializeApp(firebaseConfig);
        const auth = firebase.auth();
        const db = firebase.firestore();

        // 应用状态
        let weeksData = [];
        let currentWeekId = null;
        let currentEditTaskId = null;
        let currentEditWeekId = null;
        let unsubscribeWeeks = null;

        // DOM元素
        const loginContainer = document.getElementById('loginContainer');
        const registerContainer = document.getElementById('registerContainer');
        const appContainer = document.getElementById('appContainer');
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        const toggleRegister = document.getElementById('toggleRegister');
        const toggleLogin = document.getElementById('toggleLogin');
        const logoutBtn = document.getElementById('logoutBtn');
        const userAvatar = document.getElementById('userAvatar');
        const userName = document.getElementById('userName');
        const userEmail = document.getElementById('userEmail');
        const loader = document.getElementById('loader');

        // 应用功能相关的DOM元素
        const weeksList = document.getElementById('weeksList');
        const tasksContainer = document.getElementById('tasksContainer');
        const currentWeekTitle = document.getElementById('currentWeekTitle');
        const totalTasks = document.getElementById('totalTasks');
        const completedTasks = document.getElementById('completedTasks');
        const progress = document.getElementById('progress');
        const addWeekBtn = document.getElementById('addWeekBtn');
        const addTaskBtn = document.getElementById('addTaskBtn');
        const searchInput = document.getElementById('searchInput');
        const statusFilter = document.getElementById('statusFilter');

        // 模态框元素
        const taskModal = document.getElementById('taskModal');
        const weekModal = document.getElementById('weekModal');
        const confirmDialog = document.getElementById('confirmDialog');
        const taskForm = document.getElementById('taskForm');
        const weekForm = document.getElementById('weekForm');
        const modalTitle = document.getElementById('modalTitle');
        const weekModalTitle = document.getElementById('weekModalTitle');
        const confirmMessage = document.getElementById('confirmMessage');

        // 显示加载指示器
        function showLoader() {
            loader.style.display = 'flex';
        }

        // 隐藏加载指示器
        function hideLoader() {
            loader.style.display = 'none';
        }

        // 初始化应用
        function initApp() {
            // 设置事件监听器
            loginForm.addEventListener('submit', handleLogin);
            registerForm.addEventListener('submit', handleRegister);
            toggleRegister.addEventListener('click', () => {
                loginContainer.style.display = 'none';
                registerContainer.style.display = 'flex';
            });
            toggleLogin.addEventListener('click', () => {
                registerContainer.style.display = 'none';
                loginContainer.style.display = 'flex';
            });
            logoutBtn.addEventListener('click', handleLogout);

            // 检查用户登录状态
            auth.onAuthStateChanged(user => {
                if (user) {
                    // 用户已登录
                    showApp(user);
                } else {
                    // 用户未登录
                    showLogin();
                }
            });
        }

        // 显示登录页面
        function showLogin() {
            loginContainer.style.display = 'flex';
            registerContainer.style.display = 'none';
            appContainer.style.display = 'none';

            // 取消对数据的监听
            if (unsubscribeWeeks) {
                unsubscribeWeeks();
                unsubscribeWeeks = null;
            }
        }

        // 显示应用主界面
        function showApp(user) {
            loginContainer.style.display = 'none';
            registerContainer.style.display = 'none';
            appContainer.style.display = 'block';

            // 显示用户信息
            userAvatar.textContent = user.displayName ? user.displayName.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase();
            userName.textContent = user.displayName || '用户';
            userEmail.textContent = user.email;

            // 初始化应用功能
            initAppFunctionality();

            // 加载用户数据
            loadUserData(user.uid);
        }

        // 初始化应用功能
        function initAppFunctionality() {
            // 设置事件监听器
            addWeekBtn.addEventListener('click', () => openWeekModal());
            addTaskBtn.addEventListener('click', () => openTaskModal());

            // 模态框事件
            document.getElementById('closeModal').addEventListener('click', closeTaskModal);
            document.getElementById('cancelTask').addEventListener('click', closeTaskModal);
            document.getElementById('saveTask').addEventListener('click', saveTask);

            document.getElementById('closeWeekModal').addEventListener('click', closeWeekModal);
            document.getElementById('cancelWeek').addEventListener('click', closeWeekModal);
            document.getElementById('saveWeek').addEventListener('click', saveWeek);

            document.getElementById('cancelDelete').addEventListener('click', closeConfirmDialog);
            document.getElementById('confirmDelete').addEventListener('click', confirmDelete);

            // 搜索和过滤事件
            searchInput.addEventListener('input', renderTasks);
            statusFilter.addEventListener('change', renderTasks);

            // 点击模态框外部关闭
            window.addEventListener('click', (e) => {
                if (e.target === taskModal) closeTaskModal();
                if (e.target === weekModal) closeWeekModal();
                if (e.target === confirmDialog) closeConfirmDialog();
            });
        }

        // 加载用户数据
        function loadUserData(userId) {
            showLoader();

            // 监听用户周数据的变化
            unsubscribeWeeks = db.collection('users').doc(userId).collection('weeks')
                .orderBy('id', 'asc')
                .onSnapshot(snapshot => {
                    weeksData = [];
                    snapshot.forEach(doc => {
                        weeksData.push({
                            id: doc.id,
                            ...doc.data()
                        });
                    });

                    // 如果没有周数据，创建默认数据
                    if (weeksData.length === 0) {
                        createDefaultWeek(userId);
                    } else {
                        // 设置当前周ID
                        if (!currentWeekId || !weeksData.find(week => week.id === currentWeekId)) {
                            currentWeekId = weeksData[0].id;
                        }

                        renderWeeksList();
                        renderTasks();
                        updateStats();
                    }

                    hideLoader();
                }, error => {
                    console.error("Error loading weeks data: ", error);
                    hideLoader();
                    alert('加载数据失败，请刷新页面重试');
                });
        }

        // 创建默认周数据
        function createDefaultWeek(userId) {
            const defaultWeek = {
                id: "1",
                title: "第1周",
                date: new Date().toISOString().split('T')[0] + " 至 " +
                    new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                tasks: [
                    {
                        id: 1,
                        title: "示例任务",
                        description: "这是一个示例任务，你可以编辑或删除它",
                        status: "pending",
                        date: new Date().toISOString().split('T')[0]
                    }
                ]
            };

            db.collection('users').doc(userId).collection('weeks').doc(defaultWeek.id)
                .set(defaultWeek)
                .then(() => {
                    console.log("Default week created successfully");
                })
                .catch(error => {
                    console.error("Error creating default week: ", error);
                });
        }

        // 处理登录
        function handleLogin(e) {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            showLoader();

            auth.signInWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    // 登录成功
                    hideLoader();
                })
                .catch((error) => {
                    hideLoader();
                    alert('登录失败: ' + error.message);
                });
        }

        // 处理注册
        function handleRegister(e) {
            e.preventDefault();
            const name = document.getElementById('regName').value;
            const email = document.getElementById('regEmail').value;
            const password = document.getElementById('regPassword').value;

            showLoader();

            auth.createUserWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    // 注册成功，更新用户资料
                    return userCredential.user.updateProfile({
                        displayName: name
                    });
                })
                .then(() => {
                    hideLoader();
                    // 切换到登录页面
                    registerContainer.style.display = 'none';
                    loginContainer.style.display = 'flex';
                    alert('注册成功，请登录');
                })
                .catch((error) => {
                    hideLoader();
                    alert('注册失败: ' + error.message);
                });
        }

        // 处理退出登录
        function handleLogout() {
            showLoader();
            auth.signOut()
                .then(() => {
                    hideLoader();
                    // 退出登录成功，会触发onAuthStateChanged
                })
                .catch((error) => {
                    hideLoader();
                    alert('退出登录失败: ' + error.message);
                });
        }

        // 渲染周数列表
        function renderWeeksList() {
            weeksList.innerHTML = '';

            weeksData.forEach(week => {
                const weekItem = document.createElement('li');
                weekItem.className = `week-item ${week.id === currentWeekId ? 'active' : ''}`;
                weekItem.innerHTML = `
                    <div class="week-number">${week.id}</div>
                    <div>
                        <div>${week.title}</div>
                        <div class="week-date">${week.date}</div>
                    </div>
                    <div class="week-actions">
                        <button class="week-action-btn edit-week" data-week-id="${week.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="week-action-btn delete-week" data-week-id="${week.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;

                weekItem.addEventListener('click', (e) => {
                    if (!e.target.closest('.week-actions')) {
                        currentWeekId = week.id;
                        renderWeeksList();
                        renderTasks();
                        updateStats();
                    }
                });

                weeksList.appendChild(weekItem);
            });

            // 添加周编辑和删除事件
            document.querySelectorAll('.edit-week').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const weekId = e.currentTarget.dataset.weekId;
                    openWeekModal(weekId);
                });
            });

            document.querySelectorAll('.delete-week').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const weekId = e.currentTarget.dataset.weekId;
                    openConfirmDialog('week', weekId);
                });
            });
        }

        // 渲染任务列表
        function renderTasks() {
            const currentWeek = weeksData.find(week => week.id === currentWeekId);
            if (!currentWeek) return;

            currentWeekTitle.textContent = currentWeek.title + '学习任务';
            tasksContainer.innerHTML = '';

            const searchTerm = searchInput.value.toLowerCase();
            const statusFilterValue = statusFilter.value;

            let filteredTasks = currentWeek.tasks.filter(task => {
                const matchesSearch = task.title.toLowerCase().includes(searchTerm) ||
                    task.description.toLowerCase().includes(searchTerm);
                const matchesStatus = statusFilterValue === 'all' || task.status === statusFilterValue;
                return matchesSearch && matchesStatus;
            });

            if (filteredTasks.length === 0) {
                tasksContainer.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-tasks"></i>
                        <h3>暂无任务</h3>
                        <p>${searchTerm || statusFilterValue !== 'all' ? '没有找到匹配的任务' : '点击"添加新任务"开始创建'}</p>
                    </div>
                `;
                return;
            }

            filteredTasks.forEach(task => {
                const taskCard = document.createElement('div');
                taskCard.className = 'task-card';
                taskCard.innerHTML = `
                    <div class="task-header">
                        <div class="task-title">${task.title}</div>
                        <div class="task-status status-${task.status}">
                            ${getStatusText(task.status)}
                        </div>
                    </div>
                    <div class="task-description">${task.description}</div>
                    <div class="task-footer">
                        <div class="task-date">${task.date}</div>
                        <div class="task-actions">
                            <button class="btn btn-edit" data-task-id="${task.id}">
                                <i class="fas fa-edit"></i> 编辑
                            </button>
                            <button class="btn btn-delete" data-task-id="${task.id}">
                                <i class="fas fa-trash"></i> 删除
                            </button>
                        </div>
                    </div>
                `;

                tasksContainer.appendChild(taskCard);
            });

            // 添加任务按钮事件监听器
            document.querySelectorAll('.btn-edit').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const taskId = parseInt(e.currentTarget.dataset.taskId);
                    openTaskModal(taskId);
                });
            });

            document.querySelectorAll('.btn-delete').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const taskId = parseInt(e.currentTarget.dataset.taskId);
                    openConfirmDialog('task', taskId);
                });
            });
        }

        // 更新统计信息
        function updateStats() {
            const currentWeek = weeksData.find(week => week.id === currentWeekId);
            if (!currentWeek) return;

            const total = currentWeek.tasks.length;
            const completed = currentWeek.tasks.filter(task => task.status === 'completed').length;
            const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

            totalTasks.textContent = total;
            completedTasks.textContent = completed;
            progress.textContent = `${progressPercent}%`;
        }

        // 获取状态文本
        function getStatusText(status) {
            const statusMap = {
                'pending': '未开始',
                'in-progress': '进行中',
                'completed': '已完成'
            };
            return statusMap[status] || '未知';
        }

        // 打开任务模态框
        function openTaskModal(taskId = null) {
            currentEditTaskId = taskId;
            const currentWeek = weeksData.find(week => week.id === currentWeekId);

            if (taskId) {
                // 编辑现有任务
                modalTitle.textContent = '编辑任务';
                const task = currentWeek.tasks.find(t => t.id === taskId);
                document.getElementById('taskTitle').value = task.title;
                document.getElementById('taskDescription').value = task.description;
                document.getElementById('taskStatus').value = task.status;
                document.getElementById('taskDate').value = task.date;
            } else {
                // 创建新任务
                modalTitle.textContent = '添加新任务';
                document.getElementById('taskTitle').value = '';
                document.getElementById('taskDescription').value = '';
                document.getElementById('taskStatus').value = 'pending';
                document.getElementById('taskDate').value = new Date().toISOString().split('T')[0];
            }

            taskModal.style.display = 'flex';
        }

        // 关闭任务模态框
        function closeTaskModal() {
            taskModal.style.display = 'none';
            taskForm.reset();
        }

        // 保存任务
        function saveTask() {
            const currentWeek = weeksData.find(week => week.id === currentWeekId);
            if (!currentWeek) return;

            const title = document.getElementById('taskTitle').value.trim();
            const description = document.getElementById('taskDescription').value.trim();
            const status = document.getElementById('taskStatus').value;
            const date = document.getElementById('taskDate').value;

            if (!title) {
                alert('请输入任务标题');
                return;
            }

            const user = auth.currentUser;
            if (!user) {
                alert('用户未登录');
                return;
            }

            showLoader();

            if (currentEditTaskId) {
                // 更新现有任务
                const taskIndex = currentWeek.tasks.findIndex(t => t.id === currentEditTaskId);
                if (taskIndex !== -1) {
                    currentWeek.tasks[taskIndex] = {
                        ...currentWeek.tasks[taskIndex],
                        title,
                        description,
                        status,
                        date
                    };
                }
            } else {
                // 创建新任务
                const newTaskId = currentWeek.tasks.length > 0 ?
                    Math.max(...currentWeek.tasks.map(t => t.id)) + 1 : 1;

                currentWeek.tasks.push({
                    id: newTaskId,
                    title,
                    description,
                    status,
                    date
                });
            }

            // 更新到Firestore
            db.collection('users').doc(user.uid).collection('weeks').doc(currentWeekId)
                .update({
                    tasks: currentWeek.tasks
                })
                .then(() => {
                    hideLoader();
                    renderTasks();
                    updateStats();
                    closeTaskModal();
                })
                .catch(error => {
                    hideLoader();
                    console.error("Error saving task: ", error);
                    alert('保存任务失败，请重试');
                });
        }

        // 打开周模态框
        function openWeekModal(weekId = null) {
            currentEditWeekId = weekId;

            if (weekId) {
                // 编辑现有周
                weekModalTitle.textContent = '编辑周信息';
                const week = weeksData.find(w => w.id === weekId);
                document.getElementById('weekTitle').value = week.title;
                document.getElementById('weekDate').value = week.date;
            } else {
                // 创建新周
                weekModalTitle.textContent = '添加新周';
                document.getElementById('weekTitle').value = '';
                document.getElementById('weekDate').value = '';
            }

            weekModal.style.display = 'flex';
        }

        // 关闭周模态框
        function closeWeekModal() {
            weekModal.style.display = 'none';
            weekForm.reset();
        }

        // 保存周
        function saveWeek() {
            const title = document.getElementById('weekTitle').value.trim();
            const date = document.getElementById('weekDate').value.trim();

            if (!title || !date) {
                alert('请填写完整的周信息');
                return;
            }

            const user = auth.currentUser;
            if (!user) {
                alert('用户未登录');
                return;
            }

            showLoader();

            if (currentEditWeekId) {
                // 更新现有周
                const weekIndex = weeksData.findIndex(w => w.id === currentEditWeekId);
                if (weekIndex !== -1) {
                    weeksData[weekIndex].title = title;
                    weeksData[weekIndex].date = date;

                    // 更新到Firestore
                    db.collection('users').doc(user.uid).collection('weeks').doc(currentEditWeekId)
                        .update({
                            title,
                            date
                        })
                        .then(() => {
                            hideLoader();
                            renderWeeksList();
                            renderTasks();
                            updateStats();
                            closeWeekModal();
                        })
                        .catch(error => {
                            hideLoader();
                            console.error("Error updating week: ", error);
                            alert('更新周信息失败，请重试');
                        });
                }
            } else {
                // 创建新周
                const newWeekId = weeksData.length > 0 ?
                    (Math.max(...weeksData.map(w => parseInt(w.id))) + 1).toString() : "1";

                const newWeek = {
                    id: newWeekId,
                    title,
                    date,
                    tasks: []
                };

                // 保存到Firestore
                db.collection('users').doc(user.uid).collection('weeks').doc(newWeekId)
                    .set(newWeek)
                    .then(() => {
                        hideLoader();
                        currentWeekId = newWeekId;
                        renderWeeksList();
                        renderTasks();
                        updateStats();
                        closeWeekModal();
                    })
                    .catch(error => {
                        hideLoader();
                        console.error("Error creating week: ", error);
                        alert('创建周失败，请重试');
                    });
            }
        }

        // 打开确认对话框
        function openConfirmDialog(type, id) {
            if (type === 'task') {
                const currentWeek = weeksData.find(week => week.id === currentWeekId);
                const task = currentWeek.tasks.find(t => t.id === parseInt(id));
                confirmMessage.textContent = `确定要删除任务"${task.title}"吗？此操作无法撤销。`;
            } else {
                const week = weeksData.find(w => w.id === id);
                confirmMessage.textContent = `确定要删除"${week.title}"吗？此操作将删除该周的所有任务，且无法撤销。`;
            }

            confirmDialog.dataset.type = type;
            confirmDialog.dataset.id = id;
            confirmDialog.style.display = 'flex';
        }

        // 关闭确认对话框
        function closeConfirmDialog() {
            confirmDialog.style.display = 'none';
        }

        // 确认删除
        function confirmDelete() {
            const type = confirmDialog.dataset.type;
            const id = confirmDialog.dataset.id;
            const user = auth.currentUser;

            if (!user) {
                alert('用户未登录');
                closeConfirmDialog();
                return;
            }

            showLoader();

            if (type === 'task') {
                const currentWeek = weeksData.find(week => week.id === currentWeekId);
                const updatedTasks = currentWeek.tasks.filter(t => t.id !== parseInt(id));

                // 更新到Firestore
                db.collection('users').doc(user.uid).collection('weeks').doc(currentWeekId)
                    .update({
                        tasks: updatedTasks
                    })
                    .then(() => {
                        hideLoader();
                        renderTasks();
                        updateStats();
                        closeConfirmDialog();
                    })
                    .catch(error => {
                        hideLoader();
                        console.error("Error deleting task: ", error);
                        alert('删除任务失败，请重试');
                    });
            } else {
                if (weeksData.length <= 1) {
                    hideLoader();
                    alert('至少需要保留一个周');
                    closeConfirmDialog();
                    return;
                }

                // 从Firestore删除周
                db.collection('users').doc(user.uid).collection('weeks').doc(id)
                    .delete()
                    .then(() => {
                        hideLoader();

                        // 如果删除的是当前周，切换到第一个周
                        if (currentWeekId === id) {
                            const remainingWeeks = weeksData.filter(w => w.id !== id);
                            if (remainingWeeks.length > 0) {
                                currentWeekId = remainingWeeks[0].id;
                            }
                        }

                        renderWeeksList();
                        renderTasks();
                        updateStats();
                        closeConfirmDialog();
                    })
                    .catch(error => {
                        hideLoader();
                        console.error("Error deleting week: ", error);
                        alert('删除周失败，请重试');
                    });
            }
        }

        // 初始化应用
        document.addEventListener('DOMContentLoaded', initApp);