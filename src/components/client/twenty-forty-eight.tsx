'use client';

import { useCallback, useEffect, useState, useRef } from 'react';

type Direction = 'up' | 'down' | 'left' | 'right';
type Board = number[][];

type TwentyFortyEightProps = {
	onExit: () => void;
};

export function TwentyFortyEight({ onExit }: TwentyFortyEightProps) {
	const [board, setBoard] = useState<Board>([
		[0, 0, 0, 0],
		[0, 0, 0, 0],
		[0, 0, 0, 0],
		[0, 0, 0, 0],
	]);
	const [score, setScore] = useState(0);
	const [gameOver, setGameOver] = useState(false);

	const boardRef = useRef(board);
	const scoreRef = useRef(score);
	const gameOverRef = useRef(gameOver);

	useEffect(() => {
		boardRef.current = board;
		scoreRef.current = score;
		gameOverRef.current = gameOver;
	}, [board, score, gameOver]);

	const initializeBoard = useCallback(() => {
		const newBoard = Array(4)
			.fill(0)
			.map(() => Array(4).fill(0));
		addNewTile(newBoard);
		addNewTile(newBoard);
		setBoard(newBoard);
		setScore(0);
		setGameOver(false);
	}, []);

	function addNewTile(board: Board) {
		const emptyTiles = [];
		for (let i = 0; i < 4; i++) {
			for (let j = 0; j < 4; j++) {
				if (board[i][j] === 0) emptyTiles.push({ x: i, y: j });
			}
		}
		if (emptyTiles.length > 0) {
			const { x, y } = emptyTiles[Math.floor(Math.random() * emptyTiles.length)];
			board[x][y] = Math.random() < 0.9 ? 2 : 4;
		}
	}

	const checkGameOver = (board: Board) => {
		for (let i = 0; i < 4; i++) {
			for (let j = 0; j < 4; j++) {
				if (board[i][j] === 0) return;
				if (i < 3 && board[i][j] === board[i + 1][j]) return;
				if (j < 3 && board[i][j] === board[i][j + 1]) return;
			}
		}
		setGameOver(true);
	};

	useEffect(() => {
		initializeBoard();
	}, [initializeBoard]);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			console.log('Key pressed:', e.key);

			if (gameOver) {
				console.log('Game is over, ignoring input');
				return;
			}

			const direction = {
				ArrowUp: 'up',
				ArrowDown: 'down',
				ArrowLeft: 'left',
				ArrowRight: 'right',
			}[e.key] as Direction | undefined;

			if (!direction) {
				console.log('Invalid key, ignoring');
				return;
			}

			console.log('Moving in direction:', direction);
			console.log('Current board:', board);

			const newBoard = board.map((row) => [...row]);
			let moved = false;
			let newScore = score;

			const moveLeft = (board: Board) => {
				for (let i = 0; i < 4; i++) {
					const row = board[i].filter((cell) => cell !== 0);

					for (let j = 0; j < row.length - 1; j++) {
						if (row[j] === row[j + 1]) {
							row[j] *= 2;
							newScore += row[j];
							row.splice(j + 1, 1);
							moved = true;
							j--;
						}
					}

					const newRow = [...row, ...Array(4 - row.length).fill(0)];

					if (JSON.stringify(newRow) !== JSON.stringify(board[i])) {
						moved = true;
					}

					board[i] = newRow;
				}
				console.log('After move:', board, 'Moved:', moved);
			};

			let tempBoard = [...newBoard];

			switch (direction) {
				case 'right':
					tempBoard = tempBoard.map((row) => row.reverse());
					moveLeft(tempBoard);
					tempBoard = tempBoard.map((row) => row.reverse());
					break;
				case 'up':
					tempBoard = tempBoard[0].map((_, i) => tempBoard.map((row) => row[row.length - 1 - i]));
					moveLeft(tempBoard);
					tempBoard = tempBoard[0].map((_, i) => tempBoard.map((row) => row[i]).reverse());
					break;
				case 'down':
					tempBoard = tempBoard[0].map((_, i) => tempBoard.map((row) => row[i]).reverse());
					moveLeft(tempBoard);
					tempBoard = tempBoard[0].map((_, i) => tempBoard.map((row) => row[row.length - 1 - i]));
					break;
				case 'left':
					moveLeft(tempBoard);
					break;
			}

			if (moved) {
				console.log('Board updated, adding new tile');
				addNewTile(tempBoard);
				setBoard(tempBoard);
				setScore(newScore);
				checkGameOver(tempBoard);
			} else {
				console.log('No valid moves made');
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [board, score, gameOver]);

	return (
		<div
			className="game-container bg-white rounded-lg shadow-lg"
			onClick={() => window.focus()}
		>
			<div className="flex flex-col items-center gap-6 p-6">
				<div className="text-2xl font-bold">Score: {score}</div>

				<div
					className={`
                    grid grid-cols-4 gap-2 p-4 rounded-lg
                    ${document.activeElement === document.querySelector('.game-container') ? 'bg-gray-200' : 'bg-gray-100'}
                `}
				>
					{board.map((row, i) =>
						row.map((cell, j) => (
							<div
								key={`${i}-${j}`}
								className={`
                                    w-16 h-16 flex items-center justify-center
                                    text-2xl font-bold rounded-lg
                                    ${
										cell === 0
											? 'bg-gray-300'
											: cell <= 4
												? 'bg-blue-200'
												: cell <= 16
													? 'bg-blue-300'
													: cell <= 64
														? 'bg-blue-400'
														: cell <= 256
															? 'bg-blue-500'
															: cell <= 1024
																? 'bg-blue-600'
																: 'bg-blue-700'
									}
                                    ${cell > 64 ? 'text-white' : 'text-gray-800'}
                                `}
							>
								{cell !== 0 ? cell : ''}
							</div>
						)),
					)}
				</div>

				{gameOver && <div className="text-xl font-bold text-red-500">Game Over! Final Score: {score}</div>}

				<div className="flex gap-4">
					<button
						onClick={initializeBoard}
						className="px-6 py-2 text-white bg-blue-500 rounded-lg hover:bg-blue-600"
					>
						New Game
					</button>
					<button
						onClick={onExit}
						className="px-6 py-2 text-white bg-red-500 rounded-lg hover:bg-red-600"
					>
						Exit
					</button>
				</div>
			</div>
		</div>
	);
}
