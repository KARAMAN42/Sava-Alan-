using UnityEngine;
using UnityEngine.UI;

public class GameStatsUI : MonoBehaviour
{
    public Text moneyText;
    public Text livesText;

    void Update()
    {
        if (moneyText != null)
            moneyText.text = "$" + GameManager.Money.ToString();
        
        if (livesText != null)
            livesText.text = GameManager.Lives.ToString() + " LIVES";
    }
}
