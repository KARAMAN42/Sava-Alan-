using UnityEngine;
using System.Collections;

public class GameManager : MonoBehaviour
{
    public static bool GameIsOver;

    public GameObject gameOverUI;

    public static int Money;
    public int startMoney = 400;

    public static int Lives;
    public int startLives = 20;

    void Start()
    {
        GameIsOver = false;
        Money = startMoney;
        Lives = startLives;
    }

    void Update()
    {
        if (GameIsOver)
            return;

        if (Lives <= 0)
        {
            EndGame();
        }
    }

    void EndGame()
    {
        GameIsOver = true;
        Debug.Log("Game Over!");
        if (gameOverUI != null)
            gameOverUI.SetActive(true);
    }
}
