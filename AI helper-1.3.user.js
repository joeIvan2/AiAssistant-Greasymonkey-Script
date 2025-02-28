// ==UserScript==
// @name         AI助手選擇器
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  在一個介面中同時使用多個AI助手（Grok, ChatGPT, Gemini, Perplexity）
// @author       Your name
// @match        *://*/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
    'use strict';

    // 樣式定義
    const styles = `
        .ai-selector-container {
            position: fixed;
            background: #2c2c2c;
            padding: 15px;
            border-radius: 10px;
            z-index: 9999;
            width: 300px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            color: white;
            font-family: Arial, sans-serif;
            transition: all 0.3s;
        }

        .ai-selector-bubble {
            position: fixed;
            width: 40px;
            height: 40px;
            background: #666;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 16px;
            font-weight: bold;
            cursor: move;
            z-index: 10000;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }

        .ai-selector-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
            cursor: move;
        }

        .ai-selector-title {
            font-size: 16px;
            font-weight: bold;
        }

        .ai-selector-minimize {
            cursor: pointer;
            padding: 5px;
        }

        .ai-selector-content {
            display: none;
            flex-direction: column;
            gap: 10px;
        }

        .ai-option {
            display: flex;
            align-items: center;
            padding: 8px;
            border-radius: 5px;
            cursor: pointer;
            transition: background 0.3s;
        }

        .ai-option:hover {
            background: rgba(255,255,255,0.1);
        }

        .ai-option.selected {
            background: #4285f4;
        }

        .ai-name {
            margin-left: 10px;
        }

        .question-input {
            width: 100%;
            padding: 8px;
            border-radius: 5px;
            border: 1px solid #444;
            background: #1c1c1c;
            color: white;
            margin-top: 10px;
        }

        .send-button {
            width: 100%;
            padding: 8px;
            border-radius: 5px;
            border: none;
            background: #4285f4;
            color: white;
            cursor: pointer;
            margin-top: 10px;
        }

        .send-button:hover {
            background: #5294ff;
        }

        .send-button:disabled {
            background: #666;
            cursor: not-allowed;
        }
    `;

    // AI助手配置
    const AIs = [
        {
            id: 'gemini',
            name: 'Gemini',
            url: 'https://gemini.google.com/app',
            inputSelector: 'rich-textarea.text-input-field_textarea', // Gemini 的輸入選擇器
            color: '#8e44ad'
        },
        {
            id: 'grok',
            name: 'Grok',
            url: 'https://grok.com/',
            color: '#e74c3c'
        },
        {
            id: 'chatgpt',
            name: 'ChatGPT',
            url: 'https://chatgpt.com/',
            color: '#27ae60'
        },
        {
            id: 'perplexity',
            name: 'Perplexity',
            url: 'https://www.perplexity.ai/',
            color: '#3498db'
        }
    ];

    // 添加樣式
    GM_addStyle(styles);

    // 創建UI
    function createUI() {
        const bubble = document.createElement('div');
        bubble.className = 'ai-selector-bubble';
        bubble.textContent = 'AI';
        bubble.style.top = GM_getValue('positionTop', '20px');
        bubble.style.left = GM_getValue('positionLeft', 'calc(100% - 60px)');

        const container = document.createElement('div');
        container.className = 'ai-selector-container';
        container.style.display = 'none';

        // 創建 header
        const header = document.createElement('div');
        header.className = 'ai-selector-header';
        const title = document.createElement('div');
        title.className = 'ai-selector-title';
        title.textContent = 'AI助手選擇器';
        const minimize = document.createElement('div');
        minimize.className = 'ai-selector-minimize';
        minimize.textContent = '×';
        header.appendChild(title);
        header.appendChild(minimize);

        // 創建 content
        const content = document.createElement('div');
        content.className = 'ai-selector-content';

        // 添加 AI 選項
        AIs.forEach(ai => {
            const option = document.createElement('div');
            option.className = 'ai-option selected';
            option.dataset.aiId = ai.id;
            option.style.border = `2px solid ${ai.color}`;
            const name = document.createElement('span');
            name.className = 'ai-name';
            name.textContent = ai.name;
            option.appendChild(name);
            content.appendChild(option);
        });

        // 添加輸入框和按鈕
        const questionInput = document.createElement('textarea');
        questionInput.className = 'question-input';
        questionInput.placeholder = '輸入您的問題...';

        const sendButton = document.createElement('button');
        sendButton.className = 'send-button';
        sendButton.textContent = '發送到選中的AI';

        content.appendChild(questionInput);
        content.appendChild(sendButton);

        container.appendChild(header);
        container.appendChild(content);

        document.body.appendChild(bubble);
        document.body.appendChild(container);
        return { bubble, container };
    }

    // 初始化事件監聽
    function initializeEvents(bubble, container) {
        const aiOptions = container.querySelectorAll('.ai-option');
        const questionInput = container.querySelector('.question-input');
        const sendButton = container.querySelector('.send-button');
        const minimizeButton = container.querySelector('.ai-selector-minimize');
        const header = container.querySelector('.ai-selector-header');
        const content = container.querySelector('.ai-selector-content');

        // 選擇AI
        aiOptions.forEach(option => {
            option.addEventListener('click', () => {
                option.classList.toggle('selected');
            });
        });

        // 關閉按鈕
        minimizeButton.addEventListener('click', () => {
            container.style.display = 'none';
            bubble.style.display = 'flex';
        });

        // 發送問題
        sendButton.addEventListener('click', () => {
            const selectedAIs = [...aiOptions].filter(option => option.classList.contains('selected'));
            const question = questionInput.value.trim();

            if (selectedAIs.length > 0 && question) {
                selectedAIs.forEach(aiOption => {
                    const aiId = aiOption.dataset.aiId;
                    const ai = AIs.find(a => a.id === aiId);
                    if (ai) {
                        openAIInNewTab(ai, question);
                    }
                });
                questionInput.value = ''; // 清空輸入框
            }
        });

        // 拖曳功能並控制展開，限制在螢幕範圍內
        function makeDraggable(element, savePosition, onClick) {
            let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
            let startX = 0, startY = 0;
            let moved = false;

            element.onmousedown = dragMouseDown;

            function dragMouseDown(e) {
                e.preventDefault();
                startX = e.clientX;
                startY = e.clientY;
                pos3 = e.clientX;
                pos4 = e.clientY;
                moved = false;
                document.onmouseup = closeDragElement;
                document.onmousemove = elementDrag;
            }

            function elementDrag(e) {
                e.preventDefault();
                pos1 = pos3 - e.clientX;
                pos2 = pos4 - e.clientY;
                pos3 = e.clientX;
                pos4 = e.clientY;

                let newTop = element.offsetTop - pos2;
                let newLeft = element.offsetLeft - pos1;
                const bubbleWidth = 40;
                const bubbleHeight = 40;

                newTop = Math.max(0, Math.min(newTop, window.innerHeight - bubbleHeight));
                newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - bubbleWidth));

                element.style.top = newTop + "px";
                element.style.left = newLeft + "px";
                moved = true;
            }

            function closeDragElement(e) {
                document.onmouseup = null;
                document.onmousemove = null;
                if (savePosition) {
                    GM_setValue('positionTop', element.style.top);
                    GM_setValue('positionLeft', element.style.left);
                }
                if (!moved && Math.abs(e.clientX - startX) < 5 && Math.abs(e.clientY - startY) < 5 && onClick) {
                    onClick();
                }
            }
        }

        // 泡泡的展開邏輯
        function positionContainer() {
            const bubbleRect = bubble.getBoundingClientRect();
            const bubbleCenterX = bubbleRect.left + bubbleRect.width / 2;
            const bubbleBottomY = bubbleRect.bottom;
            const containerWidth = 300;

            let containerLeft = bubbleCenterX - containerWidth / 2;
            containerLeft = Math.max(0, Math.min(containerLeft, window.innerWidth - containerWidth));
            container.style.left = `${containerLeft}px`;
            let containerTop = bubbleBottomY;
            containerTop = Math.min(containerTop, window.innerHeight - container.offsetHeight);
            container.style.top = `${containerTop}px`;

            bubble.style.display = 'none';
            container.style.display = 'block';
            content.style.display = 'flex';
        }

        makeDraggable(bubble, true, positionContainer);
        makeDraggable(header, true);
    }

    // 在新標籤頁中打開AI
    function openAIInNewTab(ai, question) {
        const url = `${ai.url}${ai.id === 'gemini' ? '?q=' : '?q='}${encodeURIComponent(question)}`;
        window.open(url, '_blank');
    }

    // 處理 Gemini 頁面的自動輸入和提交
    function handleGeminiPage() {
        if (window.location.hostname === 'gemini.google.com' && window.location.search.includes('q=')) {
            const query = new URLSearchParams(window.location.search).get('q');
            if (query) {
                console.log("开始执行Gemini自动填入脚本");

                // 使用用户提供的函数设置问题并发送
                function setTextAndSendAfterDelay(string) {
                    // Get the rich-textarea element
                    const richTextarea = document.querySelector('rich-textarea.text-input-field_textarea');

                    // Check if the element exists
                    if (!richTextarea) {
                        console.error('Rich textarea element not found');
                        return false;
                    }

                    // Find the first div inside the rich-textarea
                    const firstDiv = richTextarea.querySelector('div');

                    // Check if the div exists
                    if (!firstDiv) {
                        console.error('No div found inside rich-textarea');
                        return false;
                    }

                    // Set the innerText of the first div
                    firstDiv.innerText = string;

                    // 触发输入事件
                    const event = new Event('input', { bubbles: true });
                    firstDiv.dispatchEvent(event);

                    console.log('Successfully set innerText of the first div to:', string);

                    // Wait for 1 second (1000ms) and then click the send button
                    setTimeout(() => {
                        // Find the send button by its class
                        const sendButton = document.querySelector('.send-button');

                        // Check if the button exists
                        if (!sendButton) {
                            console.error('Send button not found');
                            return;
                        }

                        // Click the button
                        sendButton.click();

                        console.log('Send button clicked');
                    }, 1000);

                    return true;
                }

                // 等待页面加载完成
                const waitForElement = (selector, maxAttempts = 30) => {
                    return new Promise((resolve) => {
                        let attempts = 0;
                        const interval = setInterval(() => {
                            const element = document.querySelector(selector);
                            attempts++;
                            console.log("尝试查找Gemini元素:", selector, "尝试次数:", attempts);
                            if (element) {
                                console.log("找到Gemini元素:", selector);
                                clearInterval(interval);
                                resolve(element);
                            } else if (attempts >= maxAttempts) {
                                console.log("未找到Gemini元素:", selector);
                                clearInterval(interval);
                                resolve(null);
                            }
                        }, 500);
                    });
                };

                // 尝试设置问题并提交
                const trySetQuestion = async () => {
                    // 等待输入框加载
                    await waitForElement('rich-textarea.text-input-field_textarea');

                    // 使用函数设置问题并自动发送
                    const success = setTextAndSendAfterDelay(decodeURIComponent(query));

                    return success;
                };

                trySetQuestion().then(success => {
                    if (!success) {
                        console.error("无法发送问题到Gemini");
                    }
                }).catch(e => {
                    console.error('Gemini自动填入脚本错误:', e);
                });

                // 更新 URL 移除 q=xxxx，不重新載入頁面
                window.history.replaceState({}, document.title, '/app');
            }
        }
    }

    // 啟動腳本
    function initialize() {
        const { bubble, container } = createUI();
        initializeEvents(bubble, container);
        handleGeminiPage(); // 處理 Gemini 頁面
    }

    // 等待頁面加載完成後初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})();